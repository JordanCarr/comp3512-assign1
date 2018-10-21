let gallery = {loaded: false, data: null};
let painting = {data: []};

window.addEventListener("load", retrieveGalleryList);

//retrieve gallery data from local storage or remote
function retrieveGalleryList() {
    let storage = JSON.parse(localStorage.getItem("gallery")) || null;
    if (storage) {
        gallery.data = storage;
        populateGallery();
    } else {
        fetch("https://www.randyconnolly.com/"
              + "funwebdev/services/art/galleries.php")
            .then(response => response.ok ? response.json() : Promise.reject(
                {status: response.status, statusText: response.statusText}))
            .catch(error => console.error(`Gallery Fetch Error${error}`))
            .then(data => {gallery.data = data;})
            .then(() => sortGalleryData())
            .then(() => populateGallery())
            .then(() => {
                localStorage.setItem("gallery", JSON.stringify(gallery.data));
            });
    }

    document.querySelector(".paintingClose")
            .addEventListener("click", () => toggleView());
}

function populateGallery() {
    addGalleriesToList();
    toggleViewIfLoaded();
}

function toggleViewIfLoaded() {
    if (gallery.loaded) {
        document.querySelector(".defaultView").classList.toggle("flex");
        document.querySelector(".loadingScreen").classList.toggle("hidden");
    }
}

//Populates gallery list
function addGalleriesToList() {
    let galleryList = document.querySelector(".galleryList");
    document.querySelector(".galleryPanel .placeholderLabel").style.display
        = "none";
    gallery.data.forEach(gallery => {
        let newItem = document.createElement("li");
        newItem.textContent = gallery.GalleryName;
        newItem.addEventListener("click", e => loadGallery(e, gallery));
        newItem.style.cursor = "pointer";
        galleryList.appendChild(newItem);
    });
    gallery.loaded = true;
}

function sortGalleryData() {
    gallery.data = gallery.data.sort(
        (a, b) => a.GalleryName < b.GalleryName ? -1 : 1);
}

function loadGallery(e, gallery) {
    initMap(gallery.Latitude, gallery.Longitude);
    highlightSelection(e);
    setNewGalleryInfo(gallery);
    retrievePaintings(gallery);
}

//retrieve painting data from local storage or remote
function retrievePaintings(gallery) {
    let galleryID = gallery.GalleryID;
    let storage = JSON.parse(localStorage.getItem("painting")) || null;
    if (storage && storage.find(gallery => gallery.id === galleryID)) {
        painting.data = storage;
        populatePaintings(galleryID);
    } else {
        fetch(
            `https://www.randyconnolly.com/funwebdev/services/art/paintings.php?gallery=${galleryID}`)
            .then(response => response.ok ? response.json() : Promise.reject(
                {status: response.status, statusText: response.statusText}))
            .catch(error => console.error(`Painting Fetch Error${error}`))
            .then(
                data => {painting.data.push({id: galleryID, paintings: data});})
            .then(() => populatePaintings(galleryID))
            .then(() => {
                localStorage.setItem("painting", JSON.stringify(painting.data));
            });
    }
}

function populatePaintings(galleryID) {
    setPaintingList(galleryID);
    setSortingHeaders(galleryID);

    //Clean up placeholder text
    let placeholder = document.querySelector(
        ".galleryPaintings .placeholderLabel");
    if (placeholder) placeholder.parentNode.removeChild(placeholder);

    document.querySelector("#paintingTable").classList.remove("hidden");
}

function findGallery(galleryID) {
    return painting.data.find(gallery => gallery.id === galleryID);
}

function findPainting(galleryID, paintingID) {
    return findGallery(Number.parseInt(galleryID))
        .paintings.find(painting => painting.PaintingID === paintingID);
}

//Sets up the sorting headers
function setSortingHeaders(galleryID) {
    let titleSorting = (a, b) => {
        let aText = a.querySelector("td:nth-child(3)").textContent;
        console.log(aText);
        let bText = b.querySelector("td:nth-child(3)").textContent;
        return aText < bText ? -1 : 1;
    };

    let yearSorting = (a, b) => {
        let aText = a.querySelector("td:nth-child(4)").textContent;
        console.log(aText);
        let bText = b.querySelector("td:nth-child(4)").textContent;
        return Number.parseInt(bText) - Number.parseInt(aText) ? 1 : -1;
    };

    document.querySelectorAll("#paintingTable th:not(:first-child)")
            .forEach(e => {e.style.cursor = "pointer";});

    document.querySelector("#artistHeader")
            .addEventListener("click", () => setPaintingList(galleryID));

    document.querySelector("#titleHeader")
            .addEventListener("click",
                              () => setPaintingList(galleryID, titleSorting));

    document.querySelector("#yearHeader")
            .addEventListener("click",
                              () => setPaintingList(galleryID, yearSorting));
}

function setPaintingList(galleryID, sortingFunction) {
    if (!sortingFunction) {
        sortingFunction = (a, b) => {
            let aText = a.querySelector("#artistTD").textContent;
            let bText = b.querySelector("#artistTD").textContent;
            return aText < bText ? -1 : 1;
        };
    }

    let gallery = findGallery(galleryID);

    //create array for completed rows to be sorted in before adding to page
    let rows = [];

    gallery.paintings.forEach(p => {
        //create row element and setup click handling
        let row = document.createElement("tr");
        row.id = galleryID;
        row.addEventListener("click", setupPaintingView);

        //create thumbnail stricture
        let thumbnailTD = document.createElement("td");
        let thumbnail = document.createElement("img");
        thumbnailTD.classList.add("thumbnail");
        thumbnailTD.appendChild(thumbnail);

        //create metadata stricture
        let artist = document.createElement("td");
        artist.id = "artistTD";
        let title = document.createElement("td");
        let year = document.createElement("td");

        //populate structures with appropriate content
        thumbnail.setAttribute("src",
                               `images/square-small/${p.ImageFileName}.jpg`);
        thumbnail.setAttribute("paintingID", `${p.PaintingID}`);
        artist.textContent = `${p.LastName || ""}`;
        title.textContent = `${p.Title || ""}`;
        year.textContent = `${p.YearOfWork || ""}`;

        //add data to row
        row.appendChild(thumbnailTD);
        row.appendChild(artist);
        row.appendChild(title);
        row.appendChild(year);

        //style row
        row.classList.add("paintingRow");

        //add finished row to array for sorting
        rows.push(row);
    });

    //Sort rows based on artist name ordering from last name
    rows.sort((a, b) => sortingFunction(a, b));

    //Add sorted rows to page after clearing previous rows
    let paintingTable = document.querySelector("#paintingTable");
    document.querySelectorAll("#paintingTable tr:not(:first-child)")
            .forEach(n => n.parentNode.removeChild(n));
    rows.forEach(row => paintingTable.appendChild(row));
}

//Setup function for gallery info panel
function setNewGalleryInfo(gallery) {
    //retrieve the original element for replacing later
    let oldInfo = document.querySelector(".galleryInfo");

    //Begin creation of gallery info panel
    let newInfo = document.createElement("div");

    //Make and populate divs for name container
    let nameContainer = document.createElement("div");
    let name = document.createElement("h2");
    let nameNative = document.createElement("h3");

    //Make and populate divs for location container
    let locationContainer = document.createElement("div");
    let country = document.createElement("p");
    let city = document.createElement("p");
    let address = document.createElement("p");

    //Make and populate divs for website container
    let websiteContainer = document.createElement("p");
    let website = document.createElement("a");

    //Add styling classes to new gallery info panel
    newInfo.classList.add("galleryInfo");
    newInfo.classList.add("section");

    //Populate name content and build appropriate structure
    name.textContent = `${gallery.GalleryName}`;
    nameNative.textContent = `(${gallery.GalleryNativeName})`;
    nameContainer.appendChild(name);
    nameContainer.appendChild(nameNative);
    nameContainer.classList.add("infoContainer");

    //Populate location content and build appropriate structure
    country.textContent = `${gallery.GalleryCountry}`;
    city.textContent = `${gallery.GalleryCity}`;
    address.textContent = `${gallery.GalleryAddress}`;
    locationContainer.appendChild(country);
    locationContainer.appendChild(city);
    locationContainer.appendChild(address);
    locationContainer.classList.add("infoContainer");

    //Populate website content and build appropriate structure
    website.textContent = `${new URL(gallery.GalleryWebSite).hostname}`;
    website.href = gallery.GalleryWebSite;
    website.id = "galleryURL";
    websiteContainer.appendChild(website);
    websiteContainer.classList.add("infoContainer");

    //Append container nodes to new gallery info node
    newInfo.appendChild(nameContainer);
    newInfo.appendChild(locationContainer);
    newInfo.appendChild(websiteContainer);

    //Replace existing gallery info panel with new panel
    document.querySelector(".galleryExtra").replaceChild(newInfo, oldInfo);
}

//Apply highlighting style to newly selected li after clearing previous
function highlightSelection(e) {
    document.querySelectorAll(".galleryList li")
            .forEach(i => i.classList.remove("selected"));
    e.target.classList.toggle("selected");
}

//change display mode in order to switch views
function toggleView() {
    let defaultView = document.querySelector(".defaultView");
    let paintingView = document.querySelector(".paintingView");
    defaultView.classList.toggle("hidden");
    paintingView.classList.toggle("hidden");
    paintingView.classList.toggle("flex");
}

function setupPaintingView(source) {
    //Set up access to resources for both elements and data
    let selected = source.path.find(e => e.classList.contains("paintingRow"));
    let selectedImgTag = selected.children[0].children[0];
    let galleryID = selected.id;
    let paintingID = selectedImgTag.getAttribute("paintingID");
    let foundPainting = findPainting(galleryID, paintingID);

    //Title population
    let title = foundPainting.Title;
    document.querySelector("#paintingTitle").textContent = title || "";

    //Artist population
    let artist = `${foundPainting.FirstName || ""} ${foundPainting.LastName
                                                     || ""}`;
    document.querySelector("#paintingArtist").textContent = artist || "";

    //Header speaking setup
    let headerDiv = document.querySelector("#PaintingTAContainer");
    headerDiv.setAttribute("data-speak", `${title}; ${artist}`);
    document.querySelector("#paintingHeaderSpeak span.speak")
            .addEventListener("click", headerSpeak);

    //Painting image setup
    let paintingURL = `images/medium/${foundPainting.ImageFileName}.jpg`;
    document.querySelector(".painting img").setAttribute("src", paintingURL);

    //Museum Link Population
    let museumLink = document.querySelector("#paintingMuseumLink a");
    museumLink.setAttribute("href", foundPainting.MuseumLink || "");
    museumLink.textContent = "Museum Link";

    //Wiki Link Population
    let wikiLink = document.querySelector("#paintingWikiLink a");
    wikiLink.textContent = "Wiki Link";
    wikiLink.setAttribute("href", foundPainting.WikiLink || "");

    //Description Population and speaking setup
    let desc = foundPainting.Description;
    let descDiv = document.querySelector("#paintingDescription");
    descDiv.innerHTML = desc || "";
    descDiv.setAttribute("data-speak", foundPainting.Excerpt || "");
    document.querySelector("#paintingDescriptionSpeak span.speak")
            .addEventListener("click", descSpeak);

    //Change view now everything is setup
    toggleView();
}

//Setup function for description speaking
function descSpeak(e) {
    speak(e, "#paintingDescription");
}

//Setup function for header speaking
function headerSpeak(e) {
    speak(e, "#PaintingTAContainer");
}

//Setup function for generic speaking
function speak(e, location) {
    let speakString = document.querySelector(location)
                              .getAttribute("data-speak");
    if (!speakString) speakString = "Not Available";

    let utterance = new SpeechSynthesisUtterance(speakString);
    window.speechSynthesis.speak(utterance);
}

//Setup and load map based on gallery coordinates
function initMap(latitude, longitude) {
    let mapDiv = document.querySelector(".galleryMap");
    mapDiv.style.height = "375px";

    let map;
    if (latitude && longitude) {
        map = new google.maps.Map(mapDiv, {
            center: {lat: latitude, lng: longitude},
            mapTypeId: "satellite",
            zoom: 18
        });
    }

    return map;
}
