const express = require('express');
const router = express.Router();
const app = express();
var XMLHttpRequest = require("xhr2");
const { DOMParser } = require('xmldom');
const got = require('got');
const cheerio = require('cheerio');
// const { get } = require('cheerio/lib/api/traversing');
const { create } = require('xmlbuilder2');
// const fs = require('fs');
const moment = require('moment');
var logger = require('./utils/logger');

const port = 3000;
let sitemapFile = 'sitemap.xml';
let isPage;
app.use(express.json());
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
app.use("/", router);

router.get('/test', (req, res) => {
    logger.info("Line 26 | Server Sent A Hello World!");
    res.send("Hello from test!");
});

router.post('/carryover', async (req, res) => {
    logger.info("Line 31 | Start CarryOver!");
    getContent(req, res);
});

async function getContent(req, res) {
    var allPagesHTML = [];
    const pages = req.body.pages;
    logger.info("Line 38 | Pages:" + pages);
    try {
        await Promise.all(pages.map(async (page) => {
            console.log('page', page);
            const response = await got(page.url, { retry: { limit: 3, methods: ["GET", "POST"], timeout: 0 } });
            logger.info("Line 43 | response:" + response);
            console.log('response:');
            const html = response.body;        
            const $ = cheerio.load(html);
            logger.info('html:' + $);
            // Settings data
            var pageContent = (page.settings.contentId !== '' && page.settings.contentId !== undefined) ? $(page.settings.contentId.toString()).html() : '';
            var pageTitle = (page.settings.titleId !== '' && page.settings.titleId !== undefined) ? $(page.settings.titleId.toString()).html() : '';
            // var pageUrlTitle = (page.settings.urlTitleId !== '') ? $(page.settings.urlTitleId.toString()).html() : '';
            var pageDate = (page.settings.dateId !== '' && page.settings.dateId !== undefined) ? $(page.settings.dateId.toString()).html() : '';
            if (pageDate !== "" && pageData !== undefined) {
                pageDate = moment(pageDate).format('YYYY-MM-DD HH:mm:ss');
            }
            var pageAuthor = (page.settings.authorId !== '' && page.settings.authorId !== undefined) ? $(page.settings.authorId.toString()).html() : '';

            var pageCategories = (page.settings.categoriesId !== '' && page.settings.categoriesId !== undefined) ? $(page.settings.categoriesId.toString()).html() : '';
            var pageTags = (page.settings.tagsId !== '' && page.settings.tagsId !== undefined) ? $(page.settings.tagsId.toString()).html() : '';
            isPage = page.settings.isPage;
            logger.info('settings');

            // Meta data
            var metaTitle = "";
            var metaContent = "";
            if (page.metaData.title === true) {
                metaTitle = $('meta[property="og:title"]').attr('content');
                if (metaTitle === undefined)
                    metaTitle = $('title').html()
            }
            else
                metaTitle = "None";
            if (page.metaData.content === true) {
                metaContent = $('meta[property="og:description"]').attr('content');
                if (metaContent === undefined)
                    metaContent = $('meta[name="description"]').attr('content');
            }
            else
                metaTitle = "None";
            logger.info('meta');

            var pageData = {}
            if (isPage !== '') {
                if (isPage) {
                    logger.info('isPage')
                    pageData = {
                        pageTitle: pageTitle,
                        pageContent: pageContent,
                        // pageUrlTitle: pageUrlTitle,
                        metaTitle: metaTitle,
                        metaContent: metaContent
                    };
                } else  {
                    logger.info('isBlog')
                    pageData = {
                        pageTitle: pageTitle,
                        pageContent: pageContent,
                        // pageUrlTitle: pageUrlTitle,
                        pageDate: pageDate,
                        pageAuthor: pageAuthor,
                        pageCategories: pageCategories,
                        pageTags: pageTags,
                        metaTitle: metaTitle,
                        metaContent: metaContent         
                    };
                    if (pageData.pageAuthor === '')
                        pageData.pageAuthor = 'test-author';
                }
                logger.info('Push pageData:');
                allPagesHTML.push(pageData);
            }
        }));
        if (allPagesHTML.length > 0 && isPage !== '')
        {
            logger.info("isPage:" + isPage);
            if (isPage)
                createPageXML(allPagesHTML, res);
            else
                createBlogXML(allPagesHTML, res);
        }
        else {
            res.send("Please select if the url is a page/blog");
            logger.error(`${500} - ${'Please select if the url is a page/blog'}`);
        }
    }
    catch(err) {
        logger.error(`${'Error:'} - ${err.status} - ${err.message}`);
    }
}

function createPageXML(allPagesHTML, res) {    
    let root = create({ version: '1.0', encoding: "UTF-8"})
                .ele('rss', {version: '2.0', 
                    "xmlns:excerpt": "http://wordpress.org/export/1.2/excerpt/", 
                    "xmlns:content": "http://purl.org/rss/1.0/modules/content/",
                    "xmlns:wfw": "http://wellformedweb.org/CommentAPI/",
                    "xmlns:dc": "http://purl.org/dc/elements/1.1/",
                    "xmlns:wp":"http://wordpress.org/export/1.2/"
                })
                .ele('channel')
                .ele('language').txt('en-US').up()
                .ele('wp:wxr_version').txt('1.2').up()
                .ele('generator').txt('https://wordpress.org/?v=5.0.2').up()

    for(i = 0; i < allPagesHTML.length; i++) {
        const itemData = root.ele('item').ele('title').txt(allPagesHTML[i].pageTitle).up()
                            .ele('dc:creator').dat('admin').up()
                            .ele('description').up()
                            .ele('content:encoded').dat(allPagesHTML[i].pageContent).up()
                            .ele('excerpt:encoded').dat(' ').up()
                            .ele('wp:comment_status').dat('closed').up()
                            .ele('wp:ping_status').dat('closed').up()
                            .ele('wp:status').dat('publish').up()
                            .ele('wp:post_type').dat('page').up()
                            .ele('wp:post_password').dat('').up()
                            .ele('wp:postmeta')
                                .ele('wp:meta_key').dat('_aioseop_description').up()
                                .ele('wp:meta_value').dat(allPagesHTML[i].metaContent).up()
                            .up()
                            .ele('wp:postmeta')
                                .ele('wp:meta_key').dat('_aioseop_title').up()
                                .ele('wp:meta_value').dat(allPagesHTML[i].metaTitle).up()
                            .up()                          
    }
    
    const xml = root.end({ prettyPrint: true });
    logger.info("Set Page XML");
    console.log('XML:');
    
    // Write to file
    // const parsedXml = parseString(xml);
    // let full_file_name = "./" + req_name;
    // fs.writeFileSync(full_file_name, xml, function(err) {
    //     if (err) throw err;
    // });
    // res.header('Content-Type', 'text/xml').status(200).send(xml);
    res.status(200).send({ 'xml': xml });
    
}

function createBlogXML(allPagesHTML, res) {    
    let root = create({ version: '1.0', encoding: "UTF-8"})
                .ele('rss', {version: '2.0', 
                    "xmlns:excerpt": "http://wordpress.org/export/1.2/excerpt/",
                    "xmlns:content": "http://purl.org/rss/1.0/modules/content/",
                    "xmlns:wfw": "http://wellformedweb.org/CommentAPI/",
                    "xmlns:dc": "http://purl.org/dc/elements/1.1/",
                    "xmlns:wp":"http://wordpress.org/export/1.2/"
                })
                .ele('channel')
                .ele('language').txt('en-US').up()
                .ele('wp:wxr_version').txt('1.2').up()
                .ele('generator').txt('https://wordpress.org/?v=5.0.2').up()

    for(i = 0; i < allPagesHTML.length; i++) {
        const itemData = root.ele('item').ele('title').txt(allPagesHTML[i].pageTitle).up()
                            .ele('dc:creator').dat(allPagesHTML[i].pageAuthor).up()
                            .ele('description').up()
                            .ele('content:encoded').dat(allPagesHTML[i].pageContent).up()
                            .ele('excerpt:encoded').dat(' ').up()
                            .ele('wp:post_date').dat(allPagesHTML[i].pageDate).up()
                            .ele('wp:comment_status').dat('closed').up()
                            .ele('wp:ping_status').dat('closed').up()
                            .ele('wp:status').dat('publish').up()
                            .ele('wp:post_type').dat('post').up()
                            .ele('wp:post_password').dat('').up()
                            .ele('category').att('domain', 'category').att('nicename', allPagesHTML[i].pageCategories).dat(allPagesHTML[i].pageCategories).up()
                            .ele('posttag').att('domain', 'posttag').att('nicename', allPagesHTML[i].pageTags).dat(allPagesHTML[i].pageTags).up()
    }      
    
    const xml = root.end({ prettyPrint: true });    
    logger.info("Set Page XML");
    console.log('XML:', xml);

    // const parsedXml = parseString(xml);
    // let full_file_name = "./" + req_name;
    // fs.writeFileSync(full_file_name, xml, function(err) {
    //     if (err) throw err;
    // });
    
    // res.header('Content-Type', 'text/xml').send(parsedXml);
    res.status(200).send({ 'xml': xml });
}

router.post('/estimator', (req, res) => {
    const url = req.body.url;
    console.log('url', url);
    var length = 0;
    var sitemaps = 0;
    var count = 0;
    let allURLs = [];
    let blogs = [];
    let pages = [];
    let pageData = {};
    let allImages = [];
    let scrapeImages = false;
    let countPages = 0;
    let pdfPages = [];
    let failedURLs = [];

    function getSitemapURLs(sitemapFile, callback) {
        setTimeout(() => {
            var xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function () {
                if (this.readyState == 4 && this.status == 200) {
                    var sitemapContent = this.responseText;
                    var XMLSitemap = parseXMLSitemap(sitemapContent);
                    sitemaps = XMLSitemap.getElementsByTagName('sitemap');
                    var subSitemapContent = undefined;
                    if (sitemaps !== undefined && sitemaps.length > 0) {
                        for (var i = 0; i < sitemaps.length; i++) {
                            var x = new XMLHttpRequest();
                            x.onreadystatechange = function () {
                                if (this.readyState == 4 && this.status == 200) {
                                    subSitemapContent = this.responseXML;
                                    if (subSitemapContent !== undefined)
                                        callback(subSitemapContent);
                                }
                            };
                            x.open('GET', sitemaps[i].getElementsByTagName('loc')[0].textContent, true);
                            x.send();
                        }
                    }
                    callback(XMLSitemap);
                }
            };
            xhttp.open('GET', url + sitemapFile, true);
            xhttp.send();
        }, 5000);
    }

    getSitemapURLs(sitemapFile, function (XMLSitemap) {
        var urls = XMLSitemap.getElementsByTagName("url");
        count++;
        for (var i = 0; i < urls.length; i++) {
            var urlElement = urls[i];
            var loc = urlElement.getElementsByTagName("loc")[0].textContent; // + "\\n";
            allURLs.push(loc);

            if (loc.includes('/tag/') || loc.includes('/categories/') || loc.includes('/post/') || loc.includes('/blog/')) {
                blogs.push(loc);
            }
            else {
                pages.push(loc);
            }
        }
        length = length + urls.length;

        if (sitemaps.length <= 1) {
            allURLs.forEach(pageUrl => {
                getImages(pageUrl);
            });
        } else {
            if (sitemaps[sitemaps.length - 1].baseURI !== XMLSitemap.URL && ((sitemaps.length + 1) == count)) {
                allURLs.forEach(pageUrl => {
                    getImages(pageUrl);
                });
            }
        }
    });

    async function getImages(pageUrl) {
        try {
            failedURLs.splice(failedURLs.indexOf(pageUrl), 1);
            const response = await got(pageUrl, { retry: { limit: 3, methods: ["GET", "POST"], timeout: 0 } });
            if (pageUrl.includes('.pdf')) {
                pdfPages.push(pageUrl);
            }

            const html = response.body;
            const $ = cheerio.load(html);
            console.log('image count:', $("img").length);

            $("img").each(function () {
                var image = $(this);
                var src = image.attr("src");
                if (src !== '' && src != null && src !== undefined) {
                    if (src.charAt(0) === '/') {
                        src = src.substring(1);
                    }
                    if (!allImages.includes(url + src))
                        allImages.push(url + src);
                }
            });
            countPages = countPages + 1;
            console.log('count: ', + countPages + ' ' + allURLs.length + ' ' + pageUrl);

            if (countPages === allURLs.length) {
                scrapeImages = true;
                console.log('Images:', allImages.length);
                var pageEffortData = effortcalculation(pages.length);
                var blogEffortData = effortcalculation(blogs.length);

                pageData = {
                    "allURLs": JSON.stringify(allURLs),
                    "blogs": blogs.length,
                    "pages": pages.length,
                    "images": allImages.length,
                    "pdfCount": pdfPages.length,
                    "pagesTotalEffortHrs": pageEffortData.totalEffortHrs,
                    "pagesTotalDays": pageEffortData.totalDays,
                    "blogsTotalEffortHrs": blogEffortData.totalEffortHrs,
                    "blogsTotalDays": blogEffortData.totalDays
                };
                console.log('All Images:', allImages);
                res.send(pageData);
            }
        } catch (err) {
            failedURLs.push(pageUrl);
            console.log('err:', err);
        }
    }

    function effortcalculation(numberOfItems) {
        var totaleffortpages = Math.ceil((5 * numberOfItems) / 60);
        var effortData = {
            "totalEffortHrs": totaleffortpages,
            "totalDays": Math.ceil(totaleffortpages / 8)
        };
        return effortData;
    }

    // parse a text string into an XML DOM object
    function parseXMLSitemap(content) {
        var parser = new DOMParser();
        var xmlDoc = parser.parseFromString(content, 'text/xml');
        return xmlDoc;
    }
});

app.listen(port, function(err){    
    if (err)
        console.log(err);
    console.log(`Example app listening on port ${port}!`)
});
