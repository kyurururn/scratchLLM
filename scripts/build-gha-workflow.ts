// Recalculates the path filters for the dynamic CircleCI configuration
// Usage: node .circleci/refresh-path-filters.mjs
// Then copy the output into the CircleCI config files
// See https://circleci.com/docs/using-dynamic-configuration/
// See https://github.com/circle-makotom/circle-advanced-setup-workflow

// BEGIN CONFIGURATION

const pathsFilterAction = 'dorny/paths-filter@v2';

// END CONFIGURATION

import {exec} from 'child_process';
import {promisify} from 'util';
import path from 'path';

enum DependencyType {
    Dependencies = 'dependencies',
    DevDependencies = 'devDependencies',
    PeerDependencies = 'peerDependencies'
}

type PackageJson = {
    name: string;
    location: string;
    dependencies: {[name: string]: string};
    devDependencies: {[name: string]: string};
    peerDependencies: {[name: string]: string};
};

type Workspace = {
    name: string;
    location: string;
    yamlName: string;
    dependencies: string[];
    devDependencies: string[];
    peerDependencies: string[];
    deepDependencies: string[];
};

type WorkspaceMap = {[name: string]: Workspace}
type WorkspaceList = Workspace[];

const execAsync = promisify(exec);

/**
 * Calculate dependencies between workspaces in this repository.
 * @param workspaces The result of `npm query .workspace`.
 * @param depTypes The dependency types to include in the calculation.
 * @returns A map of workspace names to their dependencies.
 */
function calculateDependencies(workspaces: Array<PackageJson>, depTypes: DependencyType[]): WorkspaceMap {
    const workspaceNames = workspaces.map(workspace => workspace.name);
    const dependencies = workspaces.reduce((bag, workspace) => {
        const workspaceEntry = depTypes.reduce((workspaceDeps, depType) => {
            const deps = workspace[depType];
            workspaceDeps[depType] = deps ? Object.keys(deps).filter(dep => workspaceNames.includes(dep)) : [];
            return workspaceDeps;
        }, <Workspace>({name: workspace.name}));
        workspaceEntry.location = workspace.location;
        workspaceEntry.yamlName = path.basename(workspace.location).replace(/@/g, '').replace(/[/.]/g, '-');
        bag[workspace.name] = workspaceEntry;
        return bag;
    }, <WorkspaceMap>({}));
    console.log('Calculating deep dependencies...');
    const addDeepDependencies = (deepDependencies: string[], workspaceName: string, depType: DependencyType) => {
        const depDeps = dependencies[workspaceName][depType] || [];
        for (let dep of depDeps) {
            if (deepDependencies.includes(dep)) {
                continue;
            }
            deepDependencies.push(dep);
            addDeepDependencies(deepDependencies, dep, depType);
        }
    };
    for (let workspace of workspaces) {
        const deepDependencies = dependencies[workspace.name].deepDependencies = [workspace.name];
        for (let depType of depTypes) {
            addDeepDependencies(deepDependencies, workspace.name, depType);
        }
    }
    return dependencies;
};

/**
 * Sort workspaces in dependency order.
 * @param workspaces The workspace map to sort.
 * @returns The workspaces sorted in dependency order.
 */
function sortWorkspaces(workspaces: WorkspaceMap): WorkspaceList {
    // TODO: is this reliable? Do we need a full topo sort?
    const sortedWorkspaces = Object.values(workspaces).sort((a, b) => {
        if (a.deepDependencies.includes(b.name)) {
            return 1;
        }
        if (b.deepDependencies.includes(a.name)) {
            return -1;
        }
        return 0;
    });
    return sortedWorkspaces;
}

function generateWorkflow(sortedWorkspaces: WorkspaceList, workspaces: WorkspaceMap): string {
    const workflowLines = [
        'name: CI/CD',
        'on:',
        '  push:',
        '  workflow_dispatch:',
        '',
        'jobs:'
    ];

    generateChangesJob(workflowLines, sortedWorkspaces, workspaces);

    generateCalls(workflowLines, sortedWorkspaces, workspaces);

    return workflowLines.join('\n');
}

function generateChangesJob(workflowLines: string[], sortedWorkspaces: WorkspaceList, workspaces: WorkspaceMap) {
    workflowLines.push('  changes:');
    workflowLines.push('    name: Detect affected workspaces');
    workflowLines.push('    runs-on: ubuntu-latest');
    workflowLines.push('    outputs:');
    for (let workspace of sortedWorkspaces) {
        workflowLines.push(`      ${workspace.yamlName}: \${{ steps.filter.outputs.${workspace.yamlName} }}`);
    }
    workflowLines.push('    steps:');
    workflowLines.push(`      - uses: ${pathsFilterAction}`);
    workflowLines.push('        id: filter');
    workflowLines.push('        with:');
    workflowLines.push('          filters: |');
    for (let workspace of sortedWorkspaces) {
        workflowLines.push(`            ${workspace.yamlName}:`);
        workflowLines.push(...workspace
            .deepDependencies
            .sort()
            .map(dep => `              - ${workspaces[dep].location}/**`)
        );
    }
}

function generateCalls(workflowLines: string[], sortedWorkspaces: WorkspaceList, workspaces: WorkspaceMap) {
    for (let workspace of sortedWorkspaces) {
        workflowLines.push(`  ${workspace.yamlName}:`);
        workflowLines.push(`    uses: ./.github/workflows/workspace-${workspace.yamlName}.yml`);
        // By default, this job will only run if the jobs it 'needs' have succeeded.
        // Instead, run even if some of those jobs are skipped, but not if they failed or if the workflow was cancelled.
        workflowLines.push(`    if: \${{ !failure() && !cancelled() && needs.changes.outputs.${workspace.yamlName} == 'true' }}`);
        const deps = workspace.deepDependencies;
        workflowLines.push('    needs:');
        workflowLines.push('      - changes');
        workflowLines.push(...deps
            .sort()
            .filter(dep => dep != workspace.name)
            .map(dep => `      - ${workspaces[dep].yamlName}`)
        );
    }
}

const main = async () => {
    console.log('Querying workspaces...');
    const packages = JSON.parse((await execAsync('npm query .workspace')).stdout) as Array<PackageJson>;
    console.log('Calculating dependencies...');
    const workspaces = calculateDependencies(packages, [DependencyType.Dependencies]);
    console.log('Sorting modules in dependency order...');
    const sortedWorkspaces = sortWorkspaces(workspaces);
    console.dir(sortedWorkspaces, {depth: null});
    console.log('Generating workflow...');
    const workflow = generateWorkflow(sortedWorkspaces, workspaces);
    console.log('Writing workflow to stdout...');
    console.log(workflow);
    console.log('Done.');
};

main().then(
    () => {
        process.exit(0);
    },
    e => {
        console.error(e);
        process.exit(1);
    }
);
