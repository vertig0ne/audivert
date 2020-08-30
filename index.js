const { spawn } = require('child_process');
const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const moment = require("moment");
const axios = require("axios");
const path = require("path");
const fs = require("fs");

const rootDir = process.argv[2];
const outputDir = process.argv[3];
const finalDir = process.argv[4];

const hook_url = process.env.HOOK_URL;
const max_jobs = process.env.MAX_JOBS || 4;

(async () => {
  const dir = await fs.readdirSync(rootDir);

  dir.forEach((d) => {
    const reg = /(?:|$)([A-Z0-9]{10})/;
    const a = reg.exec(d);
    if (a[0]) {
      console.log(`Processing ${d} with Audible ID ${a[0]}`);
      const id = a[0];
      runThis(id, path.join(rootDir, d));
    }
  })
})();


const runThis = async (id, p) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ]
  });
  const page = await browser.newPage();
  console.log(`https://www.audible.com/search?ipRedirectOverride=true&overrideBaseCountry=true&keywords=${id}`);
  await page.goto(`https://www.audible.com/search?ipRedirectOverride=true&overrideBaseCountry=true&keywords=${id}`);
  await page.waitForSelector('.bc-link');
  const html = await page.content();
  const $ = cheerio.load(html);
  await browser.close();

  const title = $('.bc-heading').find('.bc-link').text();
  const author = $('.authorLabel').find('.bc-link').map(function () {
    return $(this).text();
  }).get();

  const imageUrl = $('.bc-pub-block').find('img').attr('src');
  const narrator = $('.narratorLabel').find('.bc-link').map(function () {
    return $(this).text();
  }).get();

  let runtime = $('.runtimeLabel').find('.bc-text').text();
  runtime = runtime.substr(8, runtime.length - 8);

  let releaseDate = $('.releaseDateLabel').find('.bc-text').text().replace(/\s\s+/g, '');
  releaseDate = releaseDate.substr(13, releaseDate.length - 13);

  let language = $('.languageLabel').find('.bc-text').text().replace(/\s\s+/g, '');
  language = language.substr(9, language.length - 9);

  const rating = $('.ratingsLabel').find('.bc-text').text().replace(/\s\s+/g, '');

  let series = $('.seriesLabel').find('.bc-text').text().replace(/\s\s+/g, '');
  series = series.substr(7, series.length - 7);

  const description = $('.bc-popover-inner').find('p').text().replace(/\s\s+/g, '');

  const genre = $('.refinementFormLink').map(function () {
    return $(this).text();
  }).get();

  // console.log({ title, author, imageUrl, narrator, runtime, releaseDate, language, rating, series, description });

  if (imageUrl) {
    const image = await axios({ method: 'get', url: imageUrl, responseType: 'arraybuffer' });
    fs.writeFile(path.join(p, 'cover.jpg'), image.data, function (err) {
      if (err) return console.log(err);
      console.log(`Wrote Cover for id ${id}`);
    });
  }
  
  const a = {
    name: title,
    sortname: title.replace('The ', ''),
    album: `${series} (${title})`,
    sortalbum: `${series} (${title})`,
    artist: author.join(','),
    sortartist: author[0],
    genre: genre.join('/'),
    writer: author[0],
    albumartist: narrator.join(', '),
    year: moment(releaseDate).format('YYYY'),
    description,
    longdesc: description,
    comment: description,
    cover: path.join('./', p, 'cover.jpg'),
    series: series.split(',')[0],
    "series-part": series?.split(',')[1],
  };

  const b = Object.keys(a).map((k) => {
    return `--${k}="${a[k]}"`;
  });

  // m4b-tool merge -vv "fifty shades of grey/" --output-file "not-lerams-workout-mix.m4b"
  const args = ['merge', '-vv', p, `--jobs=${max_jobs}`, `--ffmpeg-threads=${max_jobs * 4}`, '--use-filenames-as-chapters', '--output-file', path.join(outputDir, `${series} (${title}).m4b`), ...b];
  const m4b = spawn('/usr/local/bin/m4b-tool', args);

  m4b.stdout.on('data', (data) => {
    console.log(`${data}`);
  });

  m4b.stderr.on('data', (data) => {
    console.error(`${data}`);
  });

  m4b.on('exit', function (code, signal) {
    console.log('child process exited with ' +
      `code ${code} and signal ${signal}`);

    // move output file to final destination

    console.log(path.join(outputDir, `${series} (${title}).m4b`),
    path.join(finalDir, `${series} (${title}).m4b`));
    
    await fs.copyFileSync(
      path.join(outputDir, `${series} (${title}).m4b`),
      path.join(finalDir, `${series} (${title}).m4b`));

    console.log(`renamed ${path.join(outputDir, `${series} (${title}).m4b`)} to ${path.join(finalDir, `${series} (${title}).m4b`)}`);
    fs.unlink(path.join(outputDir, `${series} (${title}).m4b`), function (err) {
      if (err) throw err;
      console.log(`deleted ${path.join(outputDir, `${series} (${title}).m4b`)}`);
    });

    if (hook_url) axios({ method: 'post', url: hook_url, data: {
      "content": "Book ${d} has been completed"
    } });

    // Clean up
    const dir = p;
    fs.rmdir(dir, { recursive: true }, (err) => {
      if (err) throw err;
      console.log(`${dir} is deleted!`);
    });
  });
};

const printProgress = (progress) => {
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  process.stdout.write(progress);
}
