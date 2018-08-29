import DBHelper from './dbhelper';

let restaurant;
var map;

/**
 * Loads the content when offline
 */
const offlineLoad = () => {
  if (!navigator.onLine) {
    fetchRestaurantFromURL((error, restaurant) => {
      if (error) { // Got an error!
        console.error(error);
      } else {
        fillBreadcrumb();
      }
    });
  }
}

/**
 * Renders DOM Element with given properties and attributes
 */
function renderElement({ type, props = {}, attributes = {} }) {
  const element = document.createElement(type);
  Object.keys(props).forEach(key => element[key] = props[key]);
  Object.keys(attributes).forEach(key => element.setAttribute(key, attributes[key]));
  return element;
}


/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
}

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const mapElement = document.getElementById('map');
  mapElement.setAttribute('aria-label', `Restaurant ${restaurant.name} on the map`);

  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const favouriteButton = document.querySelector('.fav-btn');
  favouriteButton.dataset.id = restaurant.id;
  favouriteButton.dataset.favourite = restaurant.is_favorite;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const favorites = document.getElementById('add-favorites-box');

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = 'Image of ' + restaurant.name + ' Restaurant';

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  openIDB().then(function(db) {
    var storeRo= getObjectStore(DBHelper.FAV_RESTAURANTS,'readonly',db);
    storeRo.get(restaurant.id)
    .then(idbData=>{
      if(idbData) {
        const divFav = document.createElement('div');
        divFav.innerHTML = `<strong>${restaurant.name}</strong> added to favorites ❤`;
        divFav.setAttribute("class","color-white backg-black font-center");
        favorites.append(divFav)
      }
      else
      {
        const aFav = document.createElement('a');
        aFav.innerHTML = '❤ Add to favorites!';
        aFav.setAttribute("onclick",`addToFavorites(${restaurant.id})`);
        aFav.setAttribute("id","addto-favorites");
        aFav.setAttribute("href","#restaurant-container");
        aFav.setAttribute("title","Add the " + restaurant.name + " restaurant to your favorites!");
        favorites.append(aFav)
      }
    });
  });

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h3');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  const form = createReviewFormHTML();
  ul.appendChild(form)
  const formButton = document.querySelector('#review-form-button')
  formButton.addEventListener('click', sendFormData);
  container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = review.date;
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

function sendFormData() {
  let name = document.querySelector('#review-form-name').value;
  let rating = document.querySelector('#review-form-rating').value;
  let comments = document.querySelector('#review-form-comments').value;

  const newReview = {
    restaurant_id: self.restaurant.id,
    name,
    rating,
    comments,
    id: DBHelper.getId(),
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  DBHelper.addNewReview(newReview)
    .then(() => {
      // Clearing form data
      name = "";
      rating = "";
      comments = "";

      //Adding new review to list
      const ul = document.getElementById('reviews-list');
      document.querySelector("[role='form']").remove()
      ul.appendChild(createReviewHTML(newReview));
      ul.appendChild(createReviewFormHTML());
    })
}

/**
 * Create review and add to database
 */

document.getElementById("post-review-btn").addEventListener("click", function(){
    var reviewForm = document.getElementById("reviews-form");
    var reviewFormErr = document.getElementById("reviews-form-error");

    var idRestaurant = getParameterByName('id');
    var revName = reviewForm.elements[0].value;
    var revRating = reviewForm.elements[1].value;
    var revComments = reviewForm.elements[2].value;

    // Form control
    if(!revName || !revRating || !revComments) {
      reviewFormErr.textContent = "All fields are required";
    } else {
      // Control form passed
      reviewFormErr.textContent = "";
      reviewForm.reset();

      if(navigator.onLine) {
        var fetchReviewsOption = {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            "restaurant_id": idRestaurant,
            "name": revName,
            "rating": revRating,
            "comments": revComments
          })
        }

        // If I'm online I do a POST request
        fetch(DBHelper.REVIEWS_URL,fetchReviewsOption)
        .then(response=> response.json())
        .then(jsonData=>{
          openIDB().then(function(db) {
            // Then I connect do the os and I use the return id and createdAt JSON data to store the information on the os
            var storeRw = getObjectStore(DBHelper.MAIN_REVIEWS,'readwrite',db);
            var objectRev = getObjectReview(jsonData.id,revName,revComments,convertDate(jsonData.createdAt),revRating,idRestaurant);

            storeRw.put(objectRev);
          }).then(location.reload());
        })
        .catch(e=>{
          console.log("Error on the review POST function. " + e)
        })
      } else {
        // I'm offline
        openIDB().then(function(db) {
          var storeRw = getObjectStore(DBHelper.OFFLINE_REVIEWS,'readwrite',db);

          // So, I add this review data to the offline os
          storeRw.count().then(numRows=>{
            var objectRev = getObjectReview(numRows,revName,revComments,convertDate(new Date()),revRating,idRestaurant);
            storeRw.put(objectRev);
          });
        }).then(location.reload());
      }
    }
});

/**
 * Add to favorites.
 */

function addToFavorites(idRes) {
  if(navigator.onLine) {
    var fetchReviewsOption = {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      }
    }

    fetch(DBHelper.getFavoritePutUrl(idRes),fetchReviewsOption)
    .then(response=> response.json())
    .then(jsonData=>{
      openIDB().then(function(db) {
        var storeRw = getObjectStore(DBHelper.FAV_RESTAURANTS,'readwrite',db);
        storeRw.put({
          id: idRes
        });
      });
    }).then(location.reload())
    .catch(e=>{
      console.log("Error on the review POST function. " + e)
    })
  }
}


/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
