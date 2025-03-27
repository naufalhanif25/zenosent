// Global variables
let currentPage = 1;
let perPage = 20;
let totalResults = 0;
let sortState = 1;
let query = "";
let popupTimeouts = {};

// Add event listeners to the search input field
document.getElementById("search-input").addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        searchJournal();
    }
});

document.addEventListener("keydown", function(event) {
    if (event.key === "/" && !event.target.matches("input, textarea")) {
        event.preventDefault(); 
        document.getElementById("search-input").focus();
    }
});

// Add an event listener to details/journal container
document.addEventListener("click", function(event) {
    let detailsList = document.querySelectorAll(".details.show");
    
    detailsList.forEach(details => {
        if (!details.contains(event.target) && !event.target.closest(".journal-ctr")) {
            details.classList.remove("show");
        }
    });
});

// Add an event listener to cite buttons container
document.addEventListener("click", function(event) {
    let citeButtons = document.querySelectorAll(".cite-buttons");
    let citation = document.querySelectorAll("#citation");
    let isClose = !event.target.closest(".cite-buttons");
    
    citeButtons.forEach(button => {
        if (button.classList.contains("gap") && isClose) {
            button.classList.remove("gap");
        }
    });
    
    citation.forEach(button => {
        if (button.classList.contains("open") && isClose) {
            button.classList.remove("open");
        }
    });
});

// Function to search journals based on user input
async function searchJournal() {
    query = document.getElementById("search-input").value;
    currentPage = 1;

    showPagination(false);

    // Show a message if the search input is empty
    if (!query) return showMessage("Enter keywords first!");

    fetchData();
}

// Function to check whether the abstract paragraph is empty
function isAbstractEmpty() {
    let abstractList = document.querySelectorAll(".details p");

    abstractList.forEach(abstract => {
        if (abstract.innerHTML.trim() === "") {
            abstract.style.display = "none";
        }
    })
}

// Function to fetch journal data from the CrossRef API
async function fetchData() {
    let offset = (currentPage - 1) * perPage;
    let apiUrl = `https://api.crossref.org/works?query=${query}&rows=${perPage}&offset=${offset}&sort=created&order=${sortState === 1 ? "desc" : "asc"}`;
    let journalDiv = document.getElementById("journal");

    journalDiv.innerHTML = `<div class="loading">
                                <svg viewBox="25 25 50 50">
                                    <circle r="20" cy="50" cx="50"></circle>
                                </svg>
                            </div>`;

    showPagination(false);

    try {
        let response = await fetch(apiUrl);
        let { message } = await response.json();
        let journals = message.items || [];

        if (!response.ok) return showMessage("Failed to fetch data!");

        totalResults = message["total-results"] || 0;
        
        if (!journals.length) return showMessage("No matching journals found!");

        // Create a document fragment for better performance
        let fragment = document.createDocumentFragment();

        journals.forEach((journal, index) => {
            let title = journal.title ? journal.title[0] : "Unknown title";
            let url = journal.URL ? journal.URL : "#";
            let year = journal.created && journal.created["date-parts"] ? journal.created["date-parts"][0][0] : "N/A";
            let month = journal.created && journal.created["date-parts"] ? journal.created["date-parts"][0][1] : "N/A";
            let authors = journal.author ? journal.author.map(author => `${author.given || ""} ${author.family || ""}`.trim()).filter(name => name.length > 0).join(", ") : "Unknown author";
            let publisher = journal.publisher ? journal.publisher : "Unknown publisher";
            let journalName = journal["container-title"] && journal["container-title"].length > 0 ? journal["container-title"][0] : publisher !== "Unknown publisher" ? publisher : "Unknown journal";
            let volume = journal.volume ? journal.volume : "N/A";
            let issue = journal.issue ? journal.issue : "N/A";
            let pages = journal.page ? journal.page : "N/A";
            let rawAbstract = journal.abstract ? journal.abstract.replace(/<\/?[^>]+(>|$)/g, "").replace(/\s+/g, " ").trim() : "";
            let abstract = highlightText(query, rawAbstract);
            let type = journal.type ? journal.type : "";
            let extension = journal.link ? [...new Set(journal.link.map(link => link["content-type"].split("/")[1]?.toUpperCase()).filter(Boolean))] : [];
            let journalItem = document.createElement("p");
            journalItem.className = "journal-box";

            // Unique ID for details div
            let detailsId = `details-${index}`;

            // Create journal item element
            journalItem.innerHTML = `<button class="journal-ctr" onclick="openDetails('${detailsId}')">
                                        <div class="title">
                                            <h1>${title}&nbsp;<strong>(${year})</strong></h1>
                                            <p>${authors} - ${journalName}</p>
                                            <div id="keyword" class="keyword"></div>
                                        </div>
                                        <div id="${detailsId}" class="details">
                                            <p>${abstract}</p>
                                            <div class="cite-buttons">
                                                <span onclick="openCitations('${detailsId}')">
                                                    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <path d="M10 11V8a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1Zm0 0v2a4 4 0 0 1-4 4H5m14-6V8a1 1 0 0 0-1-1h-3a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1Zm0 0v2a4 4 0 0 1-4 4h-1"/>
                                                    </svg>
                                                    <h1>Cite</h1>
                                                </span>
                                                <div id="citation">
                                                    <span onclick="citeToClipboard('${detailsId}', ['${authors}', '${year}', '${title}', '${journalName}', '${volume}', '${issue}', '${pages}'], 'APA')">
                                                        <h1>APA</h1>
                                                    </span>
                                                    <span onclick="citeToClipboard('${detailsId}', ['${authors}', '${year}', '${title}', '${journalName}', '${volume}', '${issue}', '${pages}'], 'MLA')">
                                                        <h1>MLA</h1>
                                                    </span>
                                                    <span onclick="citeToClipboard('${detailsId}', ['${authors}', '${year}', '${title}', '${journalName}', '${volume}', '${issue}', '${pages}', '${month}', '${year}'], 'IEEE')">
                                                        <h1>IEEE</h1>
                                                    </span>
                                                </div>
                                                <span onclick="openLink('${detailsId}', '${url}')">
                                                    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <path d="M13.213 9.787a3.391 3.391 0 0 0-4.795 0l-3.425 3.426a3.39 3.39 0 0 0 4.795 4.794l.321-.304m-.321-4.49a3.39 3.39 0 0 0 4.795 0l3.424-3.426a3.39 3.39 0 0 0-4.794-4.795l-1.028.961"/>
                                                    </svg>
                                                    <h1>Source</h1>
                                                </span>
                                            </div>
                                        </div>
                                    </button>`;
                                     
            fragment.appendChild(journalItem);
            addKeyword(query, rawAbstract, type, extension, journalItem);
        });

        journalDiv.innerHTML = "";
        journalDiv.appendChild(fragment);
        
        isAbstractEmpty();
        showPagination(true);
        updatePagination();
    } 
    catch (error) {
        journalDiv.innerHTML = "";
        
        showMessage("Unable to retrieve journal data. Check your internet connection!");
    }
}

// Function to highlight text (abstract)
function highlightText(keyword, text) {
    if (!keyword.trim() || !text) return text;

    let words = keyword.split(/\s+/).filter(Boolean);
    let regex = new RegExp(`\\b(${words.map(word => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "gi");

    return text.replace(regex, "<strong>$1</strong>");
}

// Function to add keyword highlights
function addKeyword(keyword, text, type, ext, journalItem) {
    if (!keyword.trim() || !journalItem) return;

    let words = keyword.split(/\s+/).filter(Boolean);
    let keywordCtr = journalItem.querySelector(".keyword");

    if (!keywordCtr) return;
    
    let lowerText = text.toLowerCase();
    let fragment = document.createDocumentFragment();

    words.forEach(word => {
        if (lowerText.includes(word.toLowerCase())) {
            let keywordBox = document.createElement("span");

            keywordBox.className = "keyword-box";
            keywordBox.innerText = word.charAt(0).toUpperCase() + word.slice(1);
            fragment.appendChild(keywordBox);
        }
    });

    type = type.split("-").map(word => {
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(" ");

    let others = [type].concat([...new Set(ext)]);

    others.forEach(other => {
        if (other !== "") {
            let keywordBox = document.createElement("span");

            keywordBox.className = "keyword-box";
            keywordBox.innerText = other;
            fragment.appendChild(keywordBox);
        }
    })

    if (!fragment.children.length) {
        keywordCtr.style.display = "none";
    } 
    else {
        keywordCtr.innerHTML = "";
        keywordCtr.appendChild(fragment);
    }
}

// Function to open journal details
function openDetails(detailsId) {
    let allDetails = document.querySelectorAll(".details");
    let details = document.getElementById(detailsId);

    allDetails.forEach(detail => {
        if (detail.id !== detailsId) {
            detail.classList.remove("show");

            let citeButtons = detail.querySelector(".cite-buttons");
            let citation = detail.querySelector("#citation");

            if (citeButtons) citeButtons.classList.remove("gap");
            if (citation) citation.classList.remove("open");
        }
    });
    
    details.classList.toggle("show");
}

// Function to set the state of the sorting buttons
function ascDesc() {
    let icon = document.querySelector(".sort-by button svg");
    let popup;

    if (sortState === 0) {
        sortState = 1;
        icon.style.transform = "rotate(0deg)";
        popup = document.getElementById("desc-popup");

        showPopup(popup);
    } 
    else {
        sortState = 0;
        icon.style.transform = "rotate(-180deg)";
        popup = document.getElementById("asc-popup");

        showPopup(popup);
    }
}

// Function to format author name
function formatAuthors(authors, type) {
    if (type === "APA") {
        let authorArray = authors.split(", ").map(author => author.trim());
        let formattedAuthors = authorArray.map((author) => {
            let nameParts = author.split(" ");
            let lastName = nameParts.pop();
            let initials = nameParts.map(name => name[0] + ".").join(" ");
    
            return `${lastName}, ${initials}`.trim();
        });
    
        if (formattedAuthors.length === 1) return formattedAuthors[0];
        if (formattedAuthors.length === 2) return formattedAuthors.join(" & ");
    
        return formattedAuthors.slice(0, -1).join(", ") + ", & " + formattedAuthors.at(-1);
    }
    else if (type === "MLA") {
        let authorList = authors.split(/,\s*|\s+and\s+/);
        let formattedAuthors = authorList.map((author) => {
            let parts = author.trim().split(" ");
            
            if (parts.length > 1) {
                let lastName = parts.pop();

                return `${lastName}, ${parts.join(" ")}`;
            }

            return author;
        });

        return formattedAuthors.length > 1 ? formattedAuthors.slice(0, -1).join(", ") + ", and " + formattedAuthors.at(-1) : formattedAuthors[0];
    }
    else if (type === "IEEE") {
        return authors
            .split(", ")
            .map(author => {
                let parts = author.replace(" and ", "").split(" ");
                let lastName = parts.pop();
                let initials = parts.map(word => word[0] + ".").join(" ");

                return `${initials} ${lastName}`;
            })
            .join(", ")
            .replace(/,([^,]*)$/, ", and$1");
    }
}

// Function to open citation buttons container
function openCitations(detailsId){
    let details = document.getElementById(detailsId);
    
    details.querySelector(".cite-buttons").classList.toggle("gap");
    details.querySelector("#citation").classList.toggle("open");
    
    openDetails(detailsId);
}

// Function to copy text to the clipboard
async function citeToClipboard(detailsId, data, type) {
    let text;

    if (type === "APA") {
        text = `${formatAuthors(data[0], "APA")} (${data[1]}). ${data[2]}. ${data[3]}, ${data[4]}(${data[5]}), ${data[6]}.`.replace(/['"]/g, "");
    }
    else if (type === "MLA") {
        text = `${formatAuthors(data[0], "MLA")}. "${data[2].replace(/['"]/g, "")}". ${data[3].replace(/['"]/g, "")}. ${data[4]}. ${data[5]}(${data[1]}):${data[6]}.`;
    }
    else if (type === "IEEE") {
        data[7] = new Date(2000, Number(data[7]) - 1).toLocaleString("en-US", { month: "long" });
        text = `${formatAuthors(data[0], "IEEE")}. "${data[2].replace(/['"]/g, "")}". ${data[3].replace(/['"]/g, "")}, vol. ${data[4]}, no. ${data[5]}, pp. ${data[6]}, ${data[7]} ${data[8]}.`;
    }

    await navigator.clipboard.writeText(text.replace(/<\/?[^>]+(>|$)/g, ""));
    
    showPopup(document.getElementById("cited-popup"));
    openCitations(detailsId);
}

// Function to open links in default browser
function openLink(detailsId, url) {
    window.electron.openLink(url);

    openDetails(detailsId);
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
function showPagination(show) {
    document.getElementById("pagination").style.opacity = show ? "1" : "0";
}

// Function to show popup
function showPopup(popup) {
    let popupId = popup.getAttribute("id");

    if (popupTimeouts[popupId]) {
        clearTimeout(popupTimeouts[popupId]);
    }

    document.querySelectorAll(".popup").forEach(p => {
        p.style.opacity = "0";
    });
    
    let pageButton = document.querySelectorAll(".pagination button");

    popup.style.opacity = "1";
    pageButton.forEach(b => { b.style.zIndex = "0"; });

    popupTimeouts[popupId] = setTimeout(() => {
        popup.style.opacity = "0";

        setTimeout(() => {
            pageButton.forEach(b => { b.style.zIndex = "1"; });
        }, 160);

        delete popupTimeouts[popupId];
    }, 2000);
}

// Function to show message
function showMessage(message, popupId = "warning-popup") {
    if (popupTimeouts[popupId]) {
        clearTimeout(popupTimeouts[popupId]);
    }

    let warningPopup = document.getElementById(popupId);
    let pageButton = document.querySelectorAll(".pagination button");

    warningPopup.classList.add("warning")    
    document.querySelectorAll(".popup").forEach(p => {
        p.style.opacity = "0";
    });
    
    warningPopup.innerHTML = message;
    warningPopup.style.opacity = "1";
    pageButton.forEach(b => { b.style.zIndex = "0"; });

    popupTimeouts[popupId] = setTimeout(() => {
        warningPopup.style.opacity = "0";

        setTimeout(() => {
            pageButton.forEach(b => { b.style.zIndex = "1"; });
        }, 160);

        delete popupTimeouts[popupId];
    }, 2000);
}
