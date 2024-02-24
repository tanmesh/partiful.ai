import axios from 'axios';
import cheerio, { text } from 'cheerio';
import fs from 'fs';

function cleanText(html) {
   // Remove HTML tags and escaped characters
   let cleanedText = html.replace(/(<([^>]+)>|\\\\\\")/gi, '');

   // Remove JavaScript code (if any)
   cleanedText = cleanedText.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

   // Remove special characters
   cleanedText = cleanedText.replace(/[^\w\s]/gi, ' ');

   cleanedText = cleanedText.replace(/\n/g, '');

   cleanedText = cleanedText.replace(/\s+/g, ' ').trim();

   return cleanedText;
}

async function scrapeWebpage(url) {
   try {
      // Make a GET request to the URL
      const response = await axios.get(url);
      // Load the HTML content into Cheerio
      const $ = cheerio.load(response.data);

      let hrefs = [];
      $('a').each((index, element) => {
         const href = $(element).attr('href');
         if (href) {
            hrefs.push(href);
         }
      });

      let text = cleanText($('h1').text()) + ' ';
      text += cleanText($('h2').text()) + ' ';
      text += cleanText($('h3').text()) + ' ';
      text += cleanText($('h4').text()) + ' ';
      $('p').each((index, element) => {
         text += cleanText($(element).text()) + ' ';
      });

      // Extract text content from the body
      const bodyText = text.trim(); // Remove leading and trailing whitespace

      // Create an object to store the body text and current link
      const jsonData = {
         link: url,
         body: bodyText,
         // links: hrefs
      };

      // console.log(`Scraped: ${hrefs}`);
      return { hrefs, jsonData };
   } catch (error) {
      console.error('Error fetching data from: ', url);
      // throw error; // Rethrow the error to be handled by the caller
   }
}


// const parent_url = 'https://docs.vectara.com/'
// const parent_url = 'https://docs.llamaindex.ai/en/stable/'
const parent_url = 'https://readme.fireworks.ai'
const filePrefix = 'fireworks';

// Call the scrapeWebpage function
let { hrefs, jsonData } = await scrapeWebpage(parent_url + '/docs/quickstart');

const data = [jsonData];

// hrefs = hrefs.slice(0, 100);

// Asynchronously scrape each href
const scrapePromises = hrefs.map(async (href) => {
   if (!href.startsWith('http') && !href.startsWith('https')) {
      href = parent_url + href;
   }
   if (href.includes('colab.research') || href.includes('github') || href.includes('twitter') || href.includes('medium')) {
      console.log(`Skipping URL: ${href}`);
      return;
   }
   try {
      const { hrefs, jsonData } = await scrapeWebpage(href);
      data.push(jsonData);
   } catch (error) {
      console.error(`Error scraping ${href}:`);
   }
});

// Wait for all scraping to complete
await Promise.all(scrapePromises);

// Write the data to a JSON file
// fs.writeFileSync('./llama_parsed_data.json', JSON.stringify(data, null, 2));

// const js = JSON.parse(fs.readFileSync('./llama_parsed_data.json', 'utf8'));

let counter = 1;

data.forEach((element) => {
   const body = element.body;
    const batches = [];
    for (let i = 0; i < body.length; i += 7000) {
        batches.push(body.substring(i, i + 7000));
    }
    batches.forEach((batch, index) => {
        const fileName = `./data/${filePrefix}_${counter}_${index + 1}.json`;
        fs.writeFileSync(fileName, JSON.stringify({ text: batch, link: element.link }));
    });
    counter++;
});
