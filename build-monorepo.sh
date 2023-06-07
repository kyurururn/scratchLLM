#!/bin/bash

set -e

# This script will use local copies of the repositories to reduce network traffic
MY_REPOS="$HOME/GitHub"

# All repositories are assumed to be hosted in this GitHub org
GITHUB_ORG="scratchfoundation"

add_repo_to_monorepo () {
    REPO_NAME="$1"
    ORG_AND_REPO_NAME="${GITHUB_ORG}/${REPO_NAME}"
    echo "Working on $ORG_AND_REPO_NAME"
    mkdir -p tmp

    #
    # Clone
    #

    # reference = go faster
    git -C tmp clone --recursive --single-branch --reference "$MY_REPOS"/"$REPO_NAME" "git@github.com:${ORG_AND_REPO_NAME}.git"
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
    git -C "tmp/${REPO_NAME}" filter-repo --to-subdirectory-filter "packages/$REPO_NAME"

    #
    # Merge it in
    #

    BRANCH="$(git -C "tmp/${REPO_NAME}" branch --format="%(refname:short)")"

    git remote add "temp-$REPO_NAME" "tmp/${REPO_NAME}"
    git fetch --no-tags "temp-$REPO_NAME"
    git merge --allow-unrelated-histories --no-verify -m "chore(deps): add packages/$REPO_NAME" "temp-$REPO_NAME/$BRANCH"
    git remote remove "temp-$REPO_NAME"
    rm -rf "tmp/${REPO_NAME}"
}

for REPO in \
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
    ;
do
    add_repo_to_monorepo "$REPO"
done

(rmdir tmp || true) 2> /dev/null

git rm -r packages/*/{.circleci,.editorconfig,.gitattributes,.github,.husky,renovate.json*}
git commit -m "chore: remove redundant repo config files from packages/*"
