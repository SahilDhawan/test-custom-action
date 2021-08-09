const exec = require('@actions/exec');
const core = require('@actions/core');
const github = require('@actions/github');
const simpleGit = require('simple-git');
const artifact = require('@actions/artifact');
const fs = require('fs');
const path = require('path');
const io = require('@actions/io');
const glob = require('@actions/glob');
const env = process.env;

async function run() {
	try {
		// Fetch input variables passed to the github action
	    const token = core.getInput('PAT');
	    const podRepo = core.getInput('pod-repository');
		const generatedFilesDirectory = core.getInput('generated-files-directory');

		// Fetch all files that are generated using swiftgen
		const globber = await glob.create(`${generatedFilesDirectory}/**`, {followSymbolicLinks: false})
		const files = await globber.glob()

		// Upload generated podspecs
	    const artifactClient = artifact.create()
	    const artifactName = 'swiftgen-generated';

	    const rootDirectory = generatedFilesDirectory;
	    const options = {
	    	continueOnError: false
	    }

	    const uploadResult = await artifactClient.uploadArtifact(artifactName, files, rootDirectory, options)
	    const uploadedFiles = uploadResult.artifactItems;

	    // Push generated files to pod-repository
	    const url = `${env.GITHUB_SERVER_URL}/${podRepo}.git`.replace(/^https:\/\//, `https://x-access-token:${token}@`);
	    const branch = github.context.ref.replace("refs/heads/", "");

	    const git = simpleGit();
        await git.addRemote('repo', url);
        await git.fetch('repo');
        await git.checkout(branch);
        await git.addConfig('user.email', `${env.GITHUB_ACTOR}@users.noreply.github.com`);
        await git.addConfig('user.name', env.GITHUB_ACTOR);

  //       const copyOptions = { recursive: true, force: false }
		// await io.cp(generatedFilesDirectory, `./${podRepo}`, copyOptions);

		console.log('Current directory: ' + process.cwd());

		await exec.exec(`touch test.txt`);
        await io.mv('test.txt', './SahilDhawan/Actions-Pod');

        process.chdir('../SahilDhawan/Actions-Pod');

        await git.add('test.txt');

        // check for git diff
        const diff = await exec.exec(
            'git', ['diff', '--quiet'], {ignoreReturnCode: true}
        );

        if (diff) {
        	console.log(`Changes being pushed`);
        	await git.commit("Update Podspecs based on RPC changes");
        	await git.push('repo', branch);
        } else {
        	console.log(`Nothing to commit`);
        }        

	}	catch (error) {
    core.setFailed(error.message);
  } 
}

run();