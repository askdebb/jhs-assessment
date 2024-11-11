export default async function randomQuotes() {
  const url = "https://quotes15.p.rapidapi.com/quotes/random/?language_code=en";
  const options = {
    method: "GET",
    headers: {
      "x-rapidapi-key": "0c71521f42msh93b64d8f0afb53bp147270jsnd36ed05c6ce3",
      "x-rapidapi-host": "quotes15.p.rapidapi.com",
    },
  };

  try {
    const response = await fetch(url, options);
    const result = await response.json();

    let quoteSentence = await result.content;
    let quoteAuthor = await result.originator.name;
    console.log("content: ", quoteSentence);
    console.log("author: ", quoteAuthor);
    console.log("result: ", result);
    quoteStructure(quoteSentence, quoteAuthor);
  } catch (error) {
    console.error(error);
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
