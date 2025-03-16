// Global variables
let currentPage = 1;
let perPage = 20;
let totalResults = 0;
let query = "";

// Add an event listener to the search input field
document.getElementById("search-input").addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        searchJournal();
    }
});

// Function to search journals based on user input
async function searchJournal() {
    query = document.getElementById("search-input").value;
    currentPage = 1;

    showPagination(false);

    if (!query) {
        let journalDiv = document.getElementById("journal");
        
        // Show a message if the search input is empty
        journalDiv.innerHTML = '<p class="fade-text">Enter keywords first!</p>';
        
        setTimeout(() => {
            journalDiv.innerHTML = "";
        }, 2000);

        return;
    }

    fetchData();
}

// Function to fetch journal data from the CrossRef API
async function fetchData() {
    let offset = (currentPage - 1) * perPage;
    let apiUrl = `https://api.crossref.org/works?query=${query}&rows=${perPage}&offset=${offset}`;
    let journalDiv = document.getElementById("journal");

    journalDiv.innerHTML = `<div class="loading">
                                <svg viewBox="25 25 50 50">
                                    <circle r="20" cy="50" cx="50"></circle>
                                </svg>
                            </div>`;

    showPagination(false);

    try {
        let response = await fetch(apiUrl);
        let data = await response.json();
        let journals = data.message.items;

        totalResults = data.message["total-results"];

        if (!journals.length) {
            journalDiv.innerHTML = '<p class="fade-text">No matching journals found.</p>';

            setTimeout(() => {
                journalDiv.innerHTML = "";
            }, 2000);

            return;
        }

        // Create a document fragment for better performance
        let fragment = document.createDocumentFragment();

        journals.forEach((journal, index) => {
            let title = journal.title ? journal.title[0] : "Unknown title";
            let url = journal.URL ? journal.URL : "#";
            let year = journal.created && journal.created["date-parts"] ? journal.created["date-parts"][0][0] : "N/A";
            let authors = journal.author ? journal.author.map(a => `${a.given} ${a.family}`).join(", ") : "Unknown author";
            let publisher = journal.publisher ? journal.publisher : "Unknown publisher";
            let journalName = journal["container-title"] && journal["container-title"].length > 0 ? journal["container-title"][0] : publisher !== "Unknown publisher" ? publisher : "Unknown journal";
            let volume = journal.volume ? journal.volume : "N/A";
            let issue = journal.issue ? journal.issue : "N/A";
            let pages = journal.page ? journal.page : "N/A";
            let abstract = journal.abstract ? journal.abstract.replace(/<\/?[^>]+(>|$)/g, "") : "";
            let apaCitation = `${formatAuthors(authors)} (${year}). ${title}. <em>${journalName}</em>, ${volume}(${issue}), ${pages}.`;
            
            let journalItem = document.createElement("p");

            // Unique ID for details div
            let detailsId = `details-${index}`;

            // Create journal item element
            journalItem.innerHTML = `<button class="journal-ctr" onclick="openDetails('${detailsId}')">
                                        <div class="title">
                                            <h1><strong>${title}</strong>&nbsp;(${year})</h1>
                                            <p>${authors} - ${publisher}</p>
                                        </div>
                                        <div id="${detailsId}" class="details">
                                            <p>${abstract}</p>
                                            <span onclick="citeToClipboard('${apaCitation}')">
                                                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <path d="M10 11V8a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1Zm0 0v2a4 4 0 0 1-4 4H5m14-6V8a1 1 0 0 0-1-1h-3a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1Zm0 0v2a4 4 0 0 1-4 4h-1"/>
                                                </svg>
                                                <h1>Cite</h1>
                                            </span>
                                            <span onclick="openLink('${url}')">
                                                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <path d="M13.213 9.787a3.391 3.391 0 0 0-4.795 0l-3.425 3.426a3.39 3.39 0 0 0 4.795 4.794l.321-.304m-.321-4.49a3.39 3.39 0 0 0 4.795 0l3.424-3.426a3.39 3.39 0 0 0-4.794-4.795l-1.028.961"/>
                                                </svg>
                                                <h1>Source</h1>
                                            </span>
                                        </div>
                                     </button>`;
            fragment.appendChild(journalItem);
        });

        journalDiv.innerHTML = "";
        journalDiv.appendChild(fragment);

        showPagination();
        updatePagination();
    } 
    catch (error) {
        journalDiv.innerHTML = '<p class="fade-text">Unable to retrieve journal data. Check your internet connection.</p>';
        
        setTimeout(() => {
            journalDiv.innerHTML = "";
        }, 2000);
    }
}

// Function to format author name
function formatAuthors(authors) {
    let authorArray = authors.split(", ").map(author => author.trim());
    let formattedAuthors = authorArray.map((author) => {
        let nameParts = author.split(" ");
        let lastName = nameParts.pop();
        let initials = nameParts.map(name => name[0] + ".").join(" ")
        let formattedName = `${lastName}, ${initials}`.trim();

        return formattedName;
    });

    if (formattedAuthors.length === 1) {
        return formattedAuthors[0];
    }
    else if (formattedAuthors.length === 2) {
        return formattedAuthors.join(" & ");
    }
    else {
        let lastAuthor = formattedAuthors.pop();

        return formattedAuthors.join(", ") + ", & " + lastAuthor;
    }
}

// Function to copy text to the clipboard
function citeToClipboard(text) {
    let popup = document.getElementById("popup");

    navigator.clipboard.writeText(text.replace(/<\/?[^>]+(>|$)/g, ""))
        .then(() => {
            popup.style.opacity = 1;

            setTimeout(() => {
                popup.style.opacity = 0;
            }, 2000);
        });
}

// Function to open links in default browser
function openLink(url) {
    window.electron.openLink(url);
}

// Function to open journal details
function openDetails(detailsId) {
    let allDetails = document.querySelectorAll(".details");
    let details = document.getElementById(detailsId);

    allDetails.forEach(details => {
        if (details.id !== detailsId) {
            details.classList.remove("show");
        }
    });

    details.classList.toggle("show");
}

// Function to update pagination controls
function updatePagination() {
    let totalPages = Math.ceil(totalResults / perPage);

    document.getElementById("page-info").innerText = `Page ${currentPage} of ${totalPages}`;
    document.getElementById("prev").classList.toggle("disable", currentPage === 1);
    document.getElementById("next").classList.toggle("disable", currentPage >= totalPages);
}

// Function to change page
function changePage(step) {
    currentPage += step;

    fetchData();
}

// Function to show pagination controls
function showPagination(show = true) {
    let pagination = document.getElementById("pagination");

    if (show === true) {
        pagination.style.opacity = 1;
    }
    else if (show === false) {
        pagination.style.opacity = 0;
    }
}