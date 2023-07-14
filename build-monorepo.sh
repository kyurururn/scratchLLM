#!/bin/bash

set -e

# This script will use local copies of the repositories to reduce network traffic
MY_REPOS="$HOME/GitHub"

# All repositories are assumed to be hosted in this GitHub org
GITHUB_ORG="scratchfoundation"

# Thanks to https://stackoverflow.com/a/17841619
join_args () {
    local d=${1-} f=${2-}
    if shift 2; then
        printf %s "$f" "${@/#/$d}"
    fi
}

add_repo_to_monorepo () {
    REPO_NAME="$1"
    ORG_AND_REPO_NAME="${GITHUB_ORG}/${REPO_NAME}"
    echo "Working on $ORG_AND_REPO_NAME"
    mkdir -p tmp

    #
    # Clone
    #

    # reference = go faster
    git -C tmp clone --single-branch --reference "$MY_REPOS"/"$REPO_NAME" "git@github.com:${ORG_AND_REPO_NAME}.git"
    # get ready to disconnect reference repo
    git -C "tmp/${REPO_NAME}" repack -a
    # actually disconnect the reference repo
    rm -f "tmp/${REPO_NAME}/.git/objects/info/alternates"

    #
    # Move to subdirectory
    #

    # make filter-repo accept this as a fresh clone
    git -C "tmp/${REPO_NAME}" gc

    # rewrite history as if all this work happened in a subdirectory
    # "git mv" is simpler but makes history less visible unless you explicitly use "--follow"
    if [ ! -f "tmp/${REPO_NAME}/.gitmodules" ]; then
        # this is significantly faster than the special case below
        git -C "tmp/${REPO_NAME}" filter-repo --to-subdirectory-filter "workspaces/$REPO_NAME"
    else
        # the .gitmodules file must stay in the repository root, but the paths inside it must be rewritten
        # this is complicated for the reasons described here: https://github.com/newren/git-filter-repo/issues/158
        # this is also slower, so we only do it for repositories that have submodules
        # if we have more than one, this will cause merge conflicts
        git -C "tmp/${REPO_NAME}" filter-repo \
            --filename-callback "return filename if filename == b'.gitmodules' else b'workspaces/${REPO_NAME}/'+filename" \
            --blob-callback "if blob.data.startswith(b'[submodule '): blob.data = blob.data.replace(b'path = ', b'path = workspaces/${REPO_NAME}/')"
    fi

    #
    # Merge it in
    #

    BRANCH="$(git -C "tmp/${REPO_NAME}" branch --format="%(refname:short)")"

    git remote add "temp-$REPO_NAME" "tmp/${REPO_NAME}"
    git fetch --no-tags "temp-$REPO_NAME"
    git merge --allow-unrelated-histories --no-verify -m "chore(deps): add workspaces/$REPO_NAME" "temp-$REPO_NAME/$BRANCH"
    git remote remove "temp-$REPO_NAME"
    rm -rf "tmp/${REPO_NAME}"
}

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

for REPO in $ALL_REPOS; do
    add_repo_to_monorepo "$REPO"
done

(rmdir tmp || true) 2> /dev/null

# submodules could be necessary for build/test scripts
git submodule update --init --recursive

# remove repository-level configuration and dependencies, like commitlint
# do not remove configuration and dependencies that could vary between packages, like semantic-release
# some of these files only make sense in the root of the repository
# others could be in subdirectories, like .editorconfig, but centralizing them makes consistency easier
# it would be nice to merge all the package-lock.json files into one but it's not clear how to do that
# just remove the package-lock.json files for now, and build a new one with "npm i" later
rm -rf workspaces/*/{.circleci,.editorconfig,.gitattributes,.github,.husky,package-lock.json,renovate.json*}
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
    ) "workspaces/${REPO}/package.json" | sponge "workspaces/${REPO}/package.json"
done
git commit -m "chore: remove repo-level configuration and deps from workspaces/*" \
    workspaces

npm i
git commit -m "chore(deps): build initial real package-lock.json" \
    package.json package-lock.json
