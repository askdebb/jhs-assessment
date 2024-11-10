export default async function fetchData() {
  let quoteBucket = [];
  try {
    let response = await fetch("https://api.gameofthronesquotes.xyz/v1/random");
    let data = await response.json(); // Wait for the JSON parsing to complete
    let quoteSentence = data.sentence;
    let quoteAuthor = data.character.name;

    quoteBucket = [];

    quoteBucket.push({
      quote: quoteSentence,
      author: quoteAuthor,
    });

    // console.log(quoteBucket);

    quoteBucket.map((singleQuote) => {
      quoteStructure(singleQuote.quote, singleQuote.author);
      // console.log(singleQuote.quote, singleQuote.author);
    });

    return quoteBucket;
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

function quoteStructure(quote, author) {
  const quoteInfo = document.querySelector(".quote-info");

  let quoteTemplate = "";

  quoteTemplate += `
              <p>${quote}</p>
              <p class="text-end fst-italic">-- ${author}</p>
`;
  quoteInfo.innerHTML = quoteTemplate;
}
