import { bumpVersion } from './helpers/bumper'
import { Toolkit } from 'actions-toolkit'

Toolkit.run(async (tools) => {
  const tagprefix = process.env.TAG_PREFIX || 'v'
  const fileName = process.env.VERSION_FILE_NAME || 'package.json'
  const entry = process.env.VERSION_ENTRY || 'version'
  const githubUser = process.env.GITHUB_USER || 'Inkblot Version Bumper'
  const githubEmail =
    process.env.GITHUB_EMAIL || 'dev@inkblottherapy.com'

  const commitMessage = 'version bumped to v'

  try {
    // SET USER
    await tools.runInWorkspace('git', [
      'config',
      'user.name',
      `"${githubUser}"`,
    ])
    await tools.runInWorkspace('git', [
      'config',
      'user.email',
      `"${githubEmail}"`,
    ])

    const currentBranch = /refs\/[a-zA-Z]+\/(.*)/.exec(
      process.env.GITHUB_REF as string,
    )?.[1] as string

    await tools.runInWorkspace('git', ['checkout', currentBranch])

    // Getting last commit information
    const lastCommit =
      JSON.stringify(await tools.runInWorkspace('git', ['log', '-1'])) || ''

    console.log('lastcommitmessage', lastCommit)

    // Bumping Starts

    if (lastCommit.includes('[ci-bump version=')) {
      const splitted = lastCommit.split('[version=\\"')
      const replace = splitted[1].split('\\"')[0]
      console.log('replace:', replace)
      await bumpVersion(fileName, { replace, entry })
    } else if (lastCommit.includes('[pre=')) {
      console.log('pre')
      const splitted = lastCommit.split('[ci-bump pre=\\"')
      const pre = splitted[1].split('\\"')[0]
      console.log('pre:', pre)
      await bumpVersion(fileName, { pre, entry })
    } else if (lastCommit.includes('[major]') || lastCommit.includes('[release]')) {
      console.log('major')
      await bumpVersion(fileName, { major: true, entry })
    } else if (lastCommit.includes('[minor]') || lastCommit.includes('[feature]')) {
      console.log('minor')
      await bumpVersion(fileName, { minor: true, entry })
    } else {
      console.log('patch')
      await bumpVersion(fileName)
    }

    const newVersion = JSON.parse(tools.getFile(fileName)).version

    await tools.runInWorkspace('git', [
      'commit',
      '-a',
      '-m',
      `ci: ${commitMessage${newVersion}`,
    ])

    // PUSH THE CHANGES
    const remoteRepo = `https://${process.env.GITHUB_ACTOR}:${process.env.GITHUB_TOKEN}@github.com/${process.env.GITHUB_REPOSITORY}.git`
    await tools.runInWorkspace('git', ['tag', `${tagprefix}${newVersion}`])
    await tools.runInWorkspace('git', ['push', remoteRepo, '--follow-tags'])
    await tools.runInWorkspace('git', ['push', remoteRepo, '--tags'])
  } catch (e) {
    tools.log.fatal(e)
    tools.exit.failure('Failed to bump version')
  }
  tools.exit.success('Version bumped!')
})
