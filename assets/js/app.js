

//1. initMap() executes to display map without markers
//2. getOpenData() synchronously runs
//*waits 9.5 seconds for JSON response (cut down on this apparent load time by storing JSON locally or adding UX features), traverses and selects object properties from the JSON file, and then stores arrays in openData object
//3. makeJSON() is called after getOpenData finishes execution. Builds array of JSON API urls to be utilzied by renderButtons() and placeMarker()
//*var jsonURL is populated with an array of JSON URLs
//4. renderButtons() executes, getting data from openData.titles and rendering into front-end buttons/checkboxes
//5. clicking button/checkbox executes placeMarker() function
//6 placeMarker() function executes, placing markers using lat/lng data from selectedAPI

var map;
var lat;
var lng;
var place;
var autocomplete;
var markers = [];
var jsonID = [];
var healthAPIs = [];
var healthAPIsParsed = [];
var colorList = [];


var openData = {
    items: [],
    theme: [],
    title: [],
    description: [],
    identifier: [],
    landingPage: [],
    dateModified: [],
}

/**
 * Data object to be written to Firebase.
*/
var data = {
    sender: null,
    timestamp: null,
    lat: null,
    lng: null,
    marker: {
        markerLat: null,
        marketLng: null
    }
};

getOpenData();

function initMap() {
    // create map
    map = new google.maps.Map(document.getElementById('map'), {
        center: {
            lat: 40.730610,
            lng: -73.935242
        },
        disableDefaultUI: true,
        zoom: 13,
        disableDoubleClickZoom: true,
        streetViewControl: false,
    });



    // detect map movement to get new coords
    // map.addListener('dragend', function () {
    //     lat = map.getCenter().lat();
    //     lng = map.getCenter().lng();
    // });

    //add marker to map and add dblclick to firebase
    map.addListener('dblclick', function (e) {
        placeMarker(latLng, apiChoice, colorIs, description, description2, description3, description4, description5);
        if (map.addListener(event) === "click") {
            return false,
                console.log("click value not added to Firebase");
        } else {
            data.marker.markerLat = e.latLng.lat();
            data.marker.markerLng = e.latLng.lng();
            addToFirebase(data);
        }


    });

    // Listen for clicks and add the location of the click to firebase.
    map.addListener('click', function (e) {
        data.lat = e.latLng.lat();
        data.lng = e.latLng.lng();
        addToFirebase(data);
    });

    // creates autocomplete
    autocomplete = new google.maps.places.Autocomplete(document.getElementById('input'));
    autocomplete.bindTo('bounds', map);
    autocomplete.setFields(['address_components', 'geometry', 'icon', 'name']);

    // handle autcomplete to get coords
    autocomplete.addListener('place_changed', function () {
        place = autocomplete.getPlace();
        map.setCenter(place.geometry.location);
        lat = map.getCenter().lat();
        lng = map.getCenter().lng();
    });
}

function fetchTimer() {
    console.log('getting data')
}

function getOpenData() {
    //JSON response for all APIs with "Health" theme
    //or fetch localStorage data
    var jsonData = JSON.parse(localStorage.getItem('json-data'));
    console.log('jsonData', jsonData)
    if (jsonData && jsonData.items.length > 0) {
        console.log('fetch localStorage');
        for (i = 0; i < jsonData.items.length; i++) {
            openData.items.push(jsonData.items[i]);
            openData.theme.push(jsonData.theme[i]);
            openData.title.push(jsonData.title[i]);
            openData.description.push(jsonData.description[i]);
            openData.identifier.push(jsonData.identifier[i]);
            openData.landingPage.push(jsonData.landingPage[i]);
            openData.dateModified.push(jsonData.dateModified[i]);
        }
        makeJSON();

    } else {
        fetchTimer();
        var url = "https://data.cityofnewyork.us/data.json?category=Health";
        $.ajax({
            url: url,
            method: "GET",
            cache: true
        }).then(function (response) {
            var dataArr = response.dataset;
            dataArr.forEach(function (element) {
                if (element.theme == 'Health') {
                    openData.items.push(element);
                    openData.theme.push(element.theme);
                    openData.title.push(element.title);
                    openData.description.push(element.description);
                    openData.identifier.push(element.identifier);
                    openData.landingPage.push(element.landingPage);
                    openData.dateModified.push(element.modified);
                }
            })
            makeJSON();
        })
    }
    console.timeEnd('timer')
}
//make usable JSON string and URL from OpenData
function makeJSON() {
    var str1 = [];
    localStorage.setItem('json-data', JSON.stringify(openData));
    var jsonData = JSON.parse(localStorage.getItem('json-data'));
    for (i = 0; i < openData.items.length; i++) {
        str1.push(openData.identifier[i]);
        var res = str1[i].slice(40);
        markers.push(res);
        markers[res] = [];
        jsonID.push(res);
    }
    renderButtons();
}

function selectAPI(element, hex) {
    healthAPIs = [];
    var apiChoice = element;
    var hasLatLng = false;

    //SQL clauses as url parameters from Socrata API
    var url = "https://data.cityofnewyork.us/resource/" + apiChoice + ".json?$where=latitude IS NOT NULL&$$app_token=TVXUJxTOhuHGBQT6aNzITS60w";
    $.ajax({
        url: url,
        method: "GET",
        cache: true
    }).then(function (results) {
        colorIs = hex;
        healthAPIs.push(JSON.stringify(results));
        healthAPIsParsed.push(JSON.parse(healthAPIs));
        console.log('health apis stringified', healthAPIs);
        console.log('health APIs parsed', healthAPIsParsed);
        for (var i = 0; i < results.length; i++) {
            var lat = results[i].latitude;
            var lng = results[i].longitude;
            var description = results[i].address;
            var description2 = results[i].street_name;
            var description3 = results[i].incident_address_2;
            var description4 = results[i].health_center;
            var description5 = results[i].facility_name;

            console.log(results[i])

            if (lat && lng) hasLatLng = true;
            var latLng = new google.maps.LatLng(lat, lng);
            placeMarker(latLng, apiChoice, colorIs, description, description2, description3, description4, description5);
        }
        if (hasLatLng === false) {
            console.log('no markers')
            //put some element on page that says user that no location data avaiable for selected data type
        }
    })
}

//function to suppress results without LatLng coordinates or JSON files
function suppressResults() {
    for (var i = 0; i < healthAPIs.length; i++) {
        console.log("latitude checker", healthAPIsParsed[i][i].latitude)
    };
}

//create buttons on front-end
function renderButtons() {
    $("#selectAPI").empty();
    generateColorList();

    for (var i = 0; i < openData.items.length; i++) {
        var button = $("<button>");
        button.addClass("api");
        button.text(openData.title[i]);
        var input = $("<input>");
        input.attr('type', 'checkbox');
        input.attr('class', 'checks');
        // input.attr('data-name', colorList[i]);
        input.attr('data-name', jsonID[i]);
        input.attr('hex', colorList[i]);
        button.prepend(input);
        $("#selectAPI").append(button);
    }
    addCheckListener();
}

function rainbow(numOfSteps, step) {
    // This function generates vibrant, "evenly spaced" colors (i.e. no clustering).
    var r, g, b;
    var h = step / numOfSteps;
    var i = ~~(h * 6);
    var f = h * 6 - i;
    var q = 1 - f;
    switch (i % 6) {
        case 0:
            r = 1;
            g = f;
            b = 0;
            break;
        case 1:
            r = q;
            g = 1;
            b = 0;
            break;
        case 2:
            r = 0;
            g = 1;
            b = f;
            break;
        case 3:
            r = 0;
            g = q;
            b = 1;
            break;
        case 4:
            r = f;
            g = 0;
            b = 1;
            break;
        case 5:
            r = 1;
            g = 0;
            b = q;
            break;
    }
    var c = ("00" + (~~(r * 255)).toString(16)).slice(-2) + ("00" + (~~(g * 255)).toString(16)).slice(-2) + ("00" + (~~(b * 255)).toString(16)).slice(-2);
    return (c);
}

function generateColorList(numOfSteps, step) {
    colorList = [];
    for (i = 0; i < jsonID.length; i++) {
        var numOfSteps = Math.floor((Math.random() * 1000) + 1);
        var step = Math.floor((Math.random() * 1000) + 1);
        var color = rainbow(numOfSteps, step)
        colorList.push(color);
    }
}

function placeMarker(position, apiChoice, colorIs, description, description2, description3, description4, description5) {
    var iconUrl = 'http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|';
    iconUrl += colorIs

    var marker = new google.maps.Marker({
        position: position,
        icon: {
            url: iconUrl
        },
        map: map,
        draggable: false,

    });

    var infowindow = new google.maps.InfoWindow({
        content: description2 ||
            description || description3 || description4 || description5
    });

    marker.addListener('click', function () {
        infowindow.open(map, marker);
    });

    markers[apiChoice].push(marker);
    return marker;

}

// remove markers from map
function removeMarker(apiChoice) {
    for (var i = 0; i < markers[apiChoice].length; i++) {
        markers[apiChoice][i].setMap(null);
    }
    markers[apiChoice] = [];
}

// event listener for checkboxes
function addCheckListener() {
    $(".checks").on("click", function () {
        if ($(this).is(":checked")) {
            markers[($(this).attr("data-name"))] = [];
            selectAPI($(this).attr("data-name"), $(this).attr("hex"));
        }
        if (!$(this).is(":checked")) {
            removeMarker($(this).attr("data-name"));
        }
    });
};

$('#menuToggle').on('click', function () {
    $('#selectAPI').toggleClass('hide');
});


//FOR PRESENTATION (DEMONSTRATION PURPOSES ONLY -- NON-WORKING CODE)
////////////////////////////////////////////////////////////////////////////////////////////////

//find all json IDs in jsonDATA
//cross reference to goodResults array
//make titles array based on goodResults
//renderButtons based on titles array

function join(lookupTable, mainTable, lookupKey, mainKey, select) {
    var l = lookupTable.length,
        m = mainTable.length,
        lookupIndex = [],
        output = [];
    for (var i = 0; i < l; i++) { // loop through l items
        var row = lookupTable[i];
        lookupIndex[row[lookupKey]] = row; // create an index for lookup table
    }
    for (var j = 0; j < m; j++) { // loop through m items
        var y = mainTable[j];
        var x = lookupIndex[y[mainKey]]; // get corresponding row from lookupTable
        output.push(select(y, x)); // select only the columns you need
    }
    return output;
};

//reference http://learnjsdata.com/combine_data.html/
//END DEMONSTRATION
////////////////////////////////////////////////////////////////////////////////////////////////////



///FIREBASE




//Create a node at firebase location to add locations as child keys
var locationsRef = firebase.database().ref("locations");


// Create a new GeoFire key under user's Firebase location
var geoFire = new GeoFire(locationsRef.push());



function makeInfoBox(controlDiv, map) {
    // Set CSS for the control border.
    var controlUI = document.createElement('div');
    controlUI.style.boxShadow = 'rgba(0, 0, 0, 0.298039) 0px 1px 4px -1px';
    controlUI.style.backgroundColor = '#fff';
    controlUI.style.border = '2px solid #fff';
    controlUI.style.borderRadius = '2px';
    controlUI.style.marginBottom = '22px';
    controlUI.style.marginTop = '10px';
    controlUI.style.textAlign = 'center';
    controlDiv.appendChild(controlUI);

    // Set CSS for the control interior.
    var controlText = document.createElement('div');
    controlText.style.color = 'rgb(25,25,25)';
    controlText.style.fontFamily = 'Roboto,Arial,sans-serif';
    controlText.style.fontSize = '16px';
    controlText.style.padding = '6px';
    controlText.textContent = 'Display some text';
    controlUI.appendChild(controlText);
}

/**
 * Starting point for running the program. Authenticates the user.
* @param {function()} onAuthSuccess - Called when authentication succeeds.
*/
function initAuthentication(onAuthSuccess) {
    firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
            // User is signed in.
            data.sender = user.uid;
            onAuthSuccess();
        } else {
            // User is signed out.
            console.log('Logout...');
        }
    });
}

/**
 * Adds a click to firebase.
 * @param {Object} data The data to be added to firebase.
 *     It contains the lat, lng, sender and timestamp.
 */
function addToFirebase(data) {
    getTimestamp(function (timestamp) {
        // Add the new timestamp to the record data.
        data.timestamp = timestamp;
        firebase.database().ref('clicks').push(data, function (err) {
            if (err) {  // Data was not written to firebase.
                console.warn(err);
            }
        });
    });
}

/**
 * Updates the last_message/ path with the current timestamp.
 * @param {function(Date)} addClick After the last message timestamp has been updated,
 *     this function is called with the current timestamp to add the
 *     click to the firebase.
 */
function getTimestamp(addClick) {

    var ref = firebase.database().ref('last_message/' + data.sender);

    ref.onDisconnect().remove();  // Delete reference from firebase on disconnect.

    ref.set(firebase.database.ServerValue.TIMESTAMP, function (err) {
        if (err) {  // Write to last message was unsuccessful.
            console.log(err);
        } else {  // Write to last message was successful.
            ref.once('value', function (snap) {
                addClick(snap.val());  // Add click with same timestamp.
            }, function (err) {
                console.warn(err);
            });
        }
    });
}