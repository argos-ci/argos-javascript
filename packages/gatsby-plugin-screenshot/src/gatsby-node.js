/* eslint-disable no-await-in-loop */
import path from 'path'
import spawn from 'cross-spawn'
import mkdirp from 'mkdirp'
import puppeteer from 'puppeteer'
import kebabcase from 'lodash.kebabcase'

function waitFor(fn) {
  return new Promise((resolve, reject) => {
    const timeoutID = setTimeout(() => reject(new Error('Timeout')), 10e3)
    function check() {
      if (!fn()) {
        setTimeout(check, 1e3)
      } else {
        clearTimeout(timeoutID)
        resolve()
      }
    }
    check()
  })
}

async function takeScreenshots(browser, paths, options = {}) {
  const {
    dir = path.join('.', path.sep, 'screenshots'),
    server: { port = 8000 } = {},
    withText = true,
  } = options
  mkdirp.sync(dir)

  const page = await browser.newPage()
  for (let i = 0; i < paths.length; i += 1) {
    await page.goto(`http://localhost:${port}${[paths[i]]}`, {
      waitUntil: 'networkidle0',
    })
    if (!withText) {
      page.addStyleTag({
        content: `
        * {
          color: transparent !important;
        }
      `,
      })
    }
    await page.screenshot({
      path: path.join(dir, `${kebabcase(paths[i]) || 'home'}.png`),
    })
  }
}

async function runBrowser(fn, options = {}) {
  const {
    browser: browserOptions = {
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-fullscreen'],
    },
  } = options
  const browser = await puppeteer.launch(browserOptions)

  try {
    await fn(browser)
  } finally {
    await browser.close()
  }
}

async function runServer(fn, options = {}) {
  const { server: { port = 8000 } = {} } = options

  const child = spawn('gatsby', ['serve', '-p', port], {
    shell: true,
  })

  let running = false
  child.stdout.on('data', data => {
    if (String(data).includes('gatsby serve running')) {
      running = true
    }
  })

  try {
    await waitFor(() => running)
    await fn(child)
  } finally {
    await new Promise(resolve => {
      child.on('exit', resolve)
      child.kill()
    })
  }
}

export async function onPostBuild({ graphql, reporter }, options = {}) {
  const { data, errors } = await graphql(`
    {
      allSitePage {
        edges {
          node {
            path
          }
        }
      }
    }
  `)

  if (errors) {
    throw new Error(errors.join(`, `))
  }

  const {
    allSitePage: { edges: pages },
  } = data

  const activity = reporter.activityTimer('taking screenshots')
  activity.start()
  await runServer(
    () =>
      runBrowser(
        async browser =>
          takeScreenshots(browser, pages.map(({ node }) => node.path), options),
        options,
      ),
    options,
  )
  activity.end()
}
