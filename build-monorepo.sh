#!/bin/bash

### Configuration ###

# All repositories are assumed to be hosted in this GitHub org
GITHUB_ORG="scratchfoundation"

# This is the list of repositories to merge into the monorepo
ALL_REPOS="
    scratch-audio \
    scratch-blocks \
    scratch-desktop \
    scratch-gui \
    scratch-l10n \
    scratch-paint \
    scratch-parser \
    scratch-render \
    scratch-sb1-converter \
    scratch-semantic-release-config \
    scratch-storage \
    scratch-svg-renderer \
    scratch-translate-extension-languages \
    scratch-vm \
    eslint-config-scratch \
    paper.js \
"

# This is the directory where you have a copy of all the repositories you want to merge.
# This script will run `git fetch` on these repos, but otherwise will not modify them.
BUILD_CACHE="./monorepo.cache"

# The monorepo will be built here. Delete it to start over.
BUILD_OUT="./monorepo.out"

# Temporary clones will be placed here. If the script completes successfully, this directory will be deleted.
BUILD_TMP="./monorepo.tmp"

# Use ${BASE_COMMIT} from ${BASE_REPO} as the starting point for the monorepo.
BASE_COMMIT="$(git rev-parse develop)"
BASE_REPO="scratch-editor"

### End configuration ###

set -e

if [ ! -d "$BUILD_CACHE" ]; then
    echo "Please link $BUILD_CACHE to a directory with a copy of all the repositories you want to merge."
    echo "For example, if you have ~/GitHub/scratch-audio, ~/GitHub/scratch-blocks, etc., then run:"
    echo "ln -s ~/GitHub $BUILD_CACHE"
    exit 1
fi

if [ -d "$BUILD_TMP" ]; then
    echo "Please remove $BUILD_TMP before running this script."
    echo "You may want: rm -rf $BUILD_TMP $BUILD_OUT"
    exit 1
fi

if [ -d "$BUILD_OUT" ]; then
    echo "Please remove $BUILD_OUT before running this script."
    echo "You may want: rm -rf $BUILD_TMP $BUILD_OUT"
    exit 1
fi

# Thanks to https://stackoverflow.com/a/17841619
join_args () {
    local d=${1-} f=${2-}
    if shift 2; then
        printf %s "$f" "${@/#/$d}"
    fi
}

init_monorepo () {
    git init "$BUILD_OUT"
    git -C "$BUILD_OUT" remote add origin "git@github.com:${GITHUB_ORG}/${BASE_REPO}.git"
    git -C "$BUILD_OUT" fetch --all
    git -C "$BUILD_OUT" checkout -b develop "$BASE_COMMIT"
}

add_repo_to_monorepo () {
    REPO_NAME="$1"
    ORG_AND_REPO_NAME="${GITHUB_ORG}/${REPO_NAME}"
    echo "Working on $ORG_AND_REPO_NAME"

    #
    # Clone
    #

    # refresh the cache
    git -C "${BUILD_CACHE}/${REPO_NAME}" fetch --all
    # reference = go faster
    git -C "$BUILD_TMP" clone --single-branch --reference "$(realpath "$BUILD_CACHE")/${REPO_NAME}" "git@github.com:${ORG_AND_REPO_NAME}.git"
    # get ready to disconnect reference repo
    git -C "${BUILD_TMP}/${REPO_NAME}" repack -a
    # actually disconnect the reference repo
    rm -f "${BUILD_TMP}/${REPO_NAME}/.git/objects/info/alternates"

    #
    # Move to subdirectory
    #

    # make filter-repo accept this as a fresh clone
    git -C "${BUILD_TMP}/${REPO_NAME}" gc

    # rewrite history as if all this work happened in a subdirectory
    # "git mv" is simpler but makes history less visible unless you explicitly use "--follow"
    if [ ! -f "${BUILD_TMP}/${REPO_NAME}/.gitmodules" ]; then
        # this is significantly faster than the special case below
        git -C "${BUILD_TMP}/${REPO_NAME}" filter-repo --to-subdirectory-filter "workspaces/$REPO_NAME"
    else
        # the .gitmodules file must stay in the repository root, but the paths inside it must be rewritten
        # this is complicated for the reasons described here: https://github.com/newren/git-filter-repo/issues/158
        # this is also slower, so we only do it for repositories that have submodules
        # if we have more than one, this will cause merge conflicts
        git -C "${BUILD_TMP}/${REPO_NAME}" filter-repo \
            --filename-callback "return filename if filename == b'.gitmodules' else b'workspaces/${REPO_NAME}/'+filename" \
            --blob-callback "if blob.data.startswith(b'[submodule '): blob.data = blob.data.replace(b'path = ', b'path = workspaces/${REPO_NAME}/')"
    fi

    #
    # Merge it in
    #

    BRANCH="$(git -C "${BUILD_TMP}/${REPO_NAME}" branch --format="%(refname:short)")"

    git -C "$BUILD_OUT" remote add "temp-$REPO_NAME" "$(realpath "${BUILD_TMP}")/${REPO_NAME}"
    git -C "$BUILD_OUT" fetch --no-tags "temp-$REPO_NAME"
    git -C "$BUILD_OUT" merge --allow-unrelated-histories --no-verify -m "chore(deps): add workspaces/$REPO_NAME" "temp-$REPO_NAME/$BRANCH"
    git -C "$BUILD_OUT" remote remove "temp-$REPO_NAME"
    rm -rf "${BUILD_TMP}/${REPO_NAME}"
}

fixup_current_branch () {
    # submodules could be necessary for build/test scripts
    git -C "$BUILD_OUT" submodule update --init --recursive

    # remove repository-level configuration and dependencies, like commitlint
    # do not remove configuration and dependencies that could vary between packages, like semantic-release
    # some of these files only make sense in the root of the repository
    # others could be in subdirectories, like .editorconfig, but centralizing them makes consistency easier
    # it would be nice to merge all the package-lock.json files into one but it's not clear how to do that
    # just remove the package-lock.json files for now, and build a new one with "npm i" later
    rm -rf "$BUILD_OUT"/workspaces/*/{.circleci,.editorconfig,.gitattributes,.github,.husky,package-lock.json,renovate.json*}
    for REPO in $ALL_REPOS; do
        jq -f <(join_args ' | ' \
            'if .scripts.prepare == "husky install" then del(.scripts.prepare) else . end' \
            'if .scripts == {} then del(.scripts.prepare) else . end' \
            'del(.config.commitizen)' \
            'if .config == {} then del(.config) else . end' \
            'del(.devDependencies."@commitlint/cli")' \
            'del(.devDependencies."@commitlint/config-conventional")' \
            'del(.devDependencies."@commitlint/travis-cli")' \
            'del(.devDependencies."cz-conventional-changelog")' \
            'del(.devDependencies."husky")' \
            'if .devDependencies == {} then del(.devDependencies) else . end' \
        ) "${BUILD_OUT}/workspaces/${REPO}/package.json" | sponge "${BUILD_OUT}/workspaces/${REPO}/package.json"
    done
    git -C "$BUILD_OUT" commit -m "chore: remove repo-level configuration and deps from workspaces/*" \
        workspaces

    npm -C "$BUILD_OUT" i
    npm -C "$BUILD_OUT" i --package-lock-only # sometimes this is necessary to get a consistent package-lock.json
    git -C "$BUILD_OUT" commit -m "chore(deps): build initial real package-lock.json" \
        package.json package-lock.json

    for REPO in $ALL_REPOS; do
        REMOVEDEPS=""
        DEPS=""
        DEVDEPS=""
        OPTDEPS=""
        PEERDEPS=""
        for DEP in $ALL_REPOS; do
            if jq -e .dependencies.\"$DEP\" "${BUILD_OUT}/workspaces/${REPO}/package.json" > /dev/null; then
                REMOVEDEPS="$REMOVEDEPS $DEP"
                DEPS="$DEPS $DEP@*"
            fi
            if jq -e .devDependencies.\"$DEP\" "${BUILD_OUT}/workspaces/${REPO}/package.json" > /dev/null; then
                REMOVEDEPS="$REMOVEDEPS $DEP"
                DEVDEPS="$DEVDEPS $DEP@*"
            fi
            if jq -e .optionalDependencies.\"$DEP\" "${BUILD_OUT}/workspaces/${REPO}/package.json" > /dev/null; then
                REMOVEDEPS="$REMOVEDEPS $DEP"
                OPTDEPS="$OPTDEPS $DEP@*"
            fi
            if jq -e .peerDependencies.\"$DEP\" "${BUILD_OUT}/workspaces/${REPO}/package.json" > /dev/null; then
                REMOVEDEPS="$REMOVEDEPS $DEP"
                PEERDEPS="$PEERDEPS $DEP@*"
            fi
        done
        if [ -n "$REMOVEDEPS" ]; then
            npm -C $BUILD_OUT uninstall $REMOVEDEPS -w "$REPO"
            if [ -n "$DEPS" ]; then
                npm -C "$BUILD_OUT" i  --save --save-exact $DEPS -w "$REPO"
            fi
            if [ -n "$DEVDEPS" ]; then
                npm -C "$BUILD_OUT" i --save-dev --save-exact $DEVDEPS -w "$REPO"
            fi
            if [ -n "$OPTDEPS" ]; then
                npm -C "$BUILD_OUT" i --save-optional --save-exact $OPTDEPS -w "$REPO"
            fi
            if [ -n "$PEERDEPS" ]; then
                npm -C "$BUILD_OUT" i --save-peer --save-exact $PEERDEPS -w "$REPO"
            fi
        fi
    done

    git -C "$BUILD_OUT" commit -m "chore(deps): use workspace versions of all local packages" \
        package.json package-lock.json workspaces/*/package.json
}

### Do the things! ###

init_monorepo

mkdir -p "$BUILD_TMP"

for REPO in $ALL_REPOS; do
    add_repo_to_monorepo "$REPO"
done

rmdir "$BUILD_TMP"

fixup_current_branch

echo "All done!"
