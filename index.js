const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const moment = require("moment");

(async () => {
    const id = process.argv[2];
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
        ]
    });
    const page = await browser.newPage();
    await page.goto(`https://www.audible.com/search?keywords=${id}`);
    await page.waitForSelector('.bc-link');
    const html = await page.content();
    const $ = cheerio.load(html);

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

    const a = {
        name: title,
        sortname: title.replace('The ', ''),
        album: `${series} (${title})`,
        sortalbum: `${series} (${title})`,
        artist: author.join(','),
        sortartist: author[0].replace('The ', ''),
        genre: genre.join('/'),
        writer: author[0],
        albumartist: narrator.join(', '),
        year: moment(releaseDate).format('YYYY'),
        description,
        longdesc: description,
        comment: description,
        cover: imageUrl,
        series: series.split(',')[0],
        seriesPart: series.split(',')[1].substr(1),
    }
    console.log(a);
})();
