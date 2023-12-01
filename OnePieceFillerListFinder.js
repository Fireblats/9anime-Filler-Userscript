// ==UserScript==
// @name         9animetv Filler Finder
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Searches animefillerlist.com/shows/one-piece to find filler episodes.
// @author       Fireblats
// @match        https://9animetv.to/watch/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=9animetv.to
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @require      file://C:/Users/pocco/OneDrive/Documents/Projects/Javascript - Greasemonkey/OnePieceFillerListFinder.js
// @run-at       document-end
// ==/UserScript==
(async function () {
    'use strict';

    var listOfMangaCanonEpisodes = [];
    var listOfFillerEpisodes = [];
    var listOfAnimeCanonEpisodes = [];
    var listOfMixedCanonFillerEpisodes = [];

    var episodeElement = null; // Initialize episodeElement to null

    // Wait for the page to load fully before starting the check
    window.addEventListener('DOMContentLoaded', function () {
        checkForElement();
    });

    (() => {
        let oldPushState = history.pushState;
        history.pushState = function pushState() {
            let ret = oldPushState.apply(this, arguments);
            window.dispatchEvent(new Event('pushstate'));
            window.dispatchEvent(new Event('locationchange'));
            return ret;
        };

        let oldReplaceState = history.replaceState;
        history.replaceState = function replaceState() {
            let ret = oldReplaceState.apply(this, arguments);
            window.dispatchEvent(new Event('replacestate'));
            window.dispatchEvent(new Event('locationchange'));
            return ret;
        };

        window.addEventListener('popstate', () => {
            window.dispatchEvent(new Event('locationchange'));
        });
    })();

    function checkForElement() {
        episodeElement = document.querySelector('li.ep-page-item.active');

        if (episodeElement !== null) {
            // Element found, call your custom main function
            main(episodeElement);
        } else {
            // Element not found, wait and check again
            setTimeout(checkForElement, 10); // Adjust the interval as needed (in milliseconds)
        }
    }

    function fillerCheck() {
        const currentEpisode = document.querySelector('a.item.ep-item.active').innerText; // 426

        // Is current episode Filler, or anime canon?
        if (listOfFillerEpisodes.includes(parseInt(currentEpisode))) {
            if (confirm("This episode is filler. Do you want to skip past all of the fillers?")) {
                // Find the next episode that is not filler.
                let nextEpisode = parseInt(currentEpisode) + 1;
                while (listOfFillerEpisodes.includes(nextEpisode)) {
                    nextEpisode++;
                }

                // strip end of href
                let strippedHref = window.location.href.substring(0, window.location.href.lastIndexOf("=") + 1);

                let dataID = document.querySelector('a.item.ep-item[data-number="' + nextEpisode + '"]').getAttribute('data-id');

                // Go to the next episode that is not filler.
                window.location.href = strippedHref + dataID;
            }
        }
    }

    function animeCanonCheck() {
        const currentEpisode = document.querySelector('a.item.ep-item.active').innerText; // 426

        // Is current anime canon?
        if (listOfAnimeCanonEpisodes.includes(parseInt(currentEpisode))) {
            if (confirm("This episode is anime canon. Do you want to skip past all of the anime canon?")) {
                // Find the next episode that is not anime canon.
                let nextEpisode = parseInt(currentEpisode) + 1;
                while (listOfAnimeCanonEpisodes.includes(nextEpisode)) {
                    nextEpisode++;
                }

                // strip end of href
                let strippedHref = window.location.href.substring(0, window.location.href.lastIndexOf("=") + 1);

                let dataID = document.querySelector('a.item.ep-item[data-number="' + nextEpisode + '"]').getAttribute('data-id');

                // Go to the next episode that is not anime canon.
                window.location.href = strippedHref + dataID;
            }
        }
    }

    // Uses GM_xmlhttpRequest to get the filler list from animefillerlist.com/shows/one-piece
    // The data we want is in <table class="EpisodeList"> that contains the episode type (canon, filler, etc)
    // The episode number, title, and type are all in <td> tags within the <table>
    // The episode number is under <td class="Number"> EPISODE NUMBER </td>
    // The episode title is under <td class="Title"> <a> EPISODE TITLE </a> </td>
    // The episode type is under <td class="Type"> <span> EPISODE TYPE </span> </td>
    async function getFillerList(showName = "one-piece") {
        const r = await GM.xmlHttpRequest({ url: `https://www.animefillerlist.com/shows/${showName}` }).catch(e => console.error(e));

        const parser = new DOMParser();
        const doc = parser.parseFromString(r.responseText, "text/html");

        // Get the table containing the episode list
        const table = doc.getElementsByClassName("EpisodeList")[0];
        const episodeNumbers = table.getElementsByClassName("Number");
        const episodeTypes = table.getElementsByClassName("Type");

        // Loop through all the episodes and add them to the appropriate list
        for (let i = 0; i < episodeNumbers.length; i++) {
            let episodeNumber = episodeNumbers[i].innerText;
            let episodeType = episodeTypes[i].innerText;

            if (episodeType === "Manga Canon") {
                listOfMangaCanonEpisodes.push(parseInt(episodeNumber));
            } else if (episodeType === "Filler") {
                listOfFillerEpisodes.push(parseInt(episodeNumber));
            } else if (episodeType === "Anime Canon") {
                listOfAnimeCanonEpisodes.push(parseInt(episodeNumber));
            } else if (episodeType === "Mixed Canon/Filler") {
                listOfMixedCanonFillerEpisodes.push(parseInt(episodeNumber));
            }
        }
    }

    function getShowName() {
        // Get the URL
        const url = window.location.href;

        // Create a URL object
        const urlObject = new URL(url);

        // Get the pathname (e.g., "/watch/one-piece-100")
        const pathname = urlObject.pathname;

        // Split the pathname by '/'
        const pathParts = pathname.split('/');

        // Get the show name parts (it's usually the second part of the path)
        let showNameParts = pathParts[2].split('-');
        showNameParts.pop();

        // Join the show name parts with hyphens to get the full show name
        const showName = showNameParts.join('-');

        console.log("Show Name:", showName);

        return showName;
    }

    // Main function
    async function main() {
        // Get the show name
        const showName = getShowName();
        await getFillerList(showName);

        window.addEventListener('locationchange', function () {
            // do filler check after short delay
            // @TODO: Figure out why this doesn't detect when the page changes.  Possibly check every now and then on a loop?
            setTimeout(fillerCheck, 1000);
            // animeCanonCheck();
        })
        fillerCheck();
        // animeCanonCheck();

        // Get all the data-pages
        let dataPages = document.querySelectorAll('li.ep-page-item[data-page]');

        // Colors
        const mangaCanonColor = "green";
        const fillerColor = "red";
        const animeCanonColor = "blue";
        const mixedCanonFillerColor = "orange";
        const unknownColor = "purple";

        // Loop through all data-pages
        dataPages.forEach(function (dataPage) {
            let dataPageNumber = dataPage.getAttribute("data-page");
            let episodeButtons = document.querySelectorAll('#episodes-page-' + dataPageNumber + ' > a');

            // Loop through all the episode buttons on this page and set the styles based on episode type
            episodeButtons.forEach(function (episodeButton) {
                let episodeNumber = episodeButton.innerText;
                let spread = '0px -6px 5px -5px';

                if (listOfMangaCanonEpisodes.includes(parseInt(episodeNumber))) {
                    episodeButton.style.setProperty("box-shadow", `inset ${mangaCanonColor} ${spread}, #000000c4 0px -14px 9px -9px inset`);
                } else if (listOfFillerEpisodes.includes(parseInt(episodeNumber))) {
                    episodeButton.style.setProperty("box-shadow", `inset ${fillerColor} ${spread}, #000000c4 0px -14px 9px -9px inset`);
                } else if (listOfAnimeCanonEpisodes.includes(parseInt(episodeNumber))) {
                    episodeButton.style.setProperty("box-shadow", `inset ${animeCanonColor} ${spread}, #000000c4 0px -14px 9px -9px inset`);
                } else if (listOfMixedCanonFillerEpisodes.includes(parseInt(episodeNumber))) {
                    episodeButton.style.setProperty("box-shadow", `inset ${mixedCanonFillerColor} ${spread}, #000000c4 0px -14px 9px -9px inset`);
                } else {
                    episodeButton.style.setProperty("box-shadow", `inset ${unknownColor} ${spread}, #000000c4 0px -14px 9px -9px inset`);
                }
            });
        });

        // Color visited links
        GM_addStyle("                                   \
        a:visited {                                 \
            border: 5px solid purple !important;    \
            font-weight: bold !important;           \
        }                                           \
    ");

        // Append color legend to the document
        let legendDiv = document.createElement('div');
        legendDiv.style.marginTop = "20px";
        legendDiv.style.marginBottom = "20px";
        legendDiv.style.padding = "10px";
        legendDiv.style.border = "1px";
        legendDiv.style.borderRadius = "5px";
        legendDiv.innerHTML = "<h3>Color Legend</h3>";
        legendDiv.innerHTML += "<p><span style='color: " + mangaCanonColor + ";'>Manga Canon</span></p>";
        legendDiv.innerHTML += "<p><span style='color: " + fillerColor + ";'>Filler</span></p>";
        legendDiv.innerHTML += "<p><span style='color: " + animeCanonColor + ";'>Anime Canon</span></p>";
        legendDiv.innerHTML += "<p><span style='color: " + mixedCanonFillerColor + ";'>Mixed Canon/Filler</span></p>";
        legendDiv.innerHTML += "<p><span style='color: " + unknownColor + ";'>Unknown</span></p>";
        document.querySelector('#main-content > section.block_area.block_area-episodes > div.block_area-content').append(legendDiv);
    }
})();
