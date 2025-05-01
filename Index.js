/**
 * Auto Elite Admin Dashboard
 * Main JavaScript file for handling authentication, form submission, and UI interactions
 */

// Global Configuration
const CONFIG = {
  API_BASE_URL: 'https://your-api-endpoint.com/api',
  LOCAL_API_URL: 'http://localhost:8080/api/v1',
  CARS_API_URL: 'http://localhost:8080/api/v1/cars',
  REDIRECT_DELAY: 1500
};

// Global state variables
let sessionToken = localStorage.getItem('sessionToken') || null;
let userData = JSON.parse(localStorage.getItem('userData')) || null;

/**
 * Authentication Module
 * Handles login, session management, and authentication state
 */
const AuthModule = (() => {
  /**
   * Checks if user is logged in, redirects to login page if not
   */
  const checkLoginStatus = () => {
    const isLoggedIn = localStorage.getItem('autoEliteLoggedIn') || sessionStorage.getItem('autoEliteLoggedIn');
    if (isLoggedIn === 'false' || !isLoggedIn) {
      window.location.href = 'login.html';
    }
  };

  /**
   * Handles user login process
   * @param {string} username - User's username
   * @param {string} password - User's password
   * @param {boolean} rememberMe - Whether to remember login in localStorage
   * @returns {Object} Result object with success status and message
   */
  const handleLogin = async (username, password, rememberMe = false) => {
    try {
      const response = await fetch(`${CONFIG.LOCAL_API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const result = await response.json();

      if (response.ok) {
        // Store login state
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem('autoEliteLoggedIn', 'true');
        storage.setItem('autoEliteUser', username);

        // Store token and user data if available
        if (result.token) {
          localStorage.setItem('sessionToken', result.token);
          sessionToken = result.token;
        }

        if (result.userData) {
          localStorage.setItem('userData', JSON.stringify(result.userData));
          userData = result.userData;
        }

        return { success: true, message: 'Login successful! Redirecting...' };
      } else {
        return {
          success: false,
          message: result.message || 'Invalid username or password. Please try again.'
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'An error occurred. Please try again later.'
      };
    }
  };

  /**
   * Logs out the user and clears all session data
   */
  const logout = () => {
    localStorage.removeItem('autoEliteLoggedIn');
    sessionStorage.removeItem('autoEliteLoggedIn');
    localStorage.removeItem('autoEliteUser');
    sessionStorage.removeItem('autoEliteUser');
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('userData');
    window.location.href = 'login.html';
  };

  /**
   * Checks if user is authenticated and updates UI accordingly
   * @returns {boolean} Whether user is authenticated
   */
  const checkAuthentication = () => {
    if (!sessionToken && !(localStorage.getItem('autoEliteLoggedIn') || sessionStorage.getItem('autoEliteLoggedIn'))) {
      window.location.href = 'login.html';
      return false;
    }

    // Update user info in header
    if (userData) {
      updateUserInterface(userData);
    }

    return true;
  };

  /**
   * Updates UI elements with user data
   * @param {Object} user - User data object
   */
  const updateUserInterface = (user) => {
    const userNameElement = document.getElementById('username');
    const userRoleElement = document.getElementById('userRole');
    const userAvatarElement = document.getElementById('userAvatar');

    if (userNameElement) userNameElement.textContent = user.name || 'Admin User';
    if (userRoleElement) userRoleElement.textContent = user.role || 'Administrator';
    if (userAvatarElement && user.avatar) userAvatarElement.src = user.avatar;
  };

  return {
    checkLoginStatus,
    handleLogin,
    logout,
    checkAuthentication
  };
})();

/**
 * Image Handler Module
 * Manages image upload and preview functionality
 */
const ImageHandlerModule = (() => {
  /**
   * Sets up image upload and preview functionality
   */
  const initialize = () => {
    const addImageBox = document.getElementById('addImageBox');
    const imageInput = document.getElementById('imageInput');
    const imagePreview = document.getElementById('imagePreview');

    if (!addImageBox || !imageInput || !imagePreview) return;

    // When the '+' is clicked, open the file picker
    addImageBox.addEventListener('click', () => {
      imageInput.click();
    });

    // When images are selected
    imageInput.addEventListener('change', (event) => {
      handleImageSelection(event, imagePreview, addImageBox);
    });
  };

  /**
   * Handles image selection and preview generation
   * @param {Event} event - Change event from file input
   * @param {HTMLElement} previewContainer - Container for image previews
   * @param {HTMLElement} addButton - Button to add more images
   */
  const handleImageSelection = (event, previewContainer, addButton) => {
    const files = event.target.files;

    if (files.length > 0) {
      for (const file of files) {
        const reader = new FileReader();
        reader.onload = function (e) {
          const previewBox = createImagePreview(e.target.result);
          previewContainer.insertBefore(previewBox, addButton);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  /**
   * Creates an image preview element
   * @param {string} imageSrc - Base64 image data
   * @returns {HTMLElement} Image preview container
   */
  const createImagePreview = (imageSrc) => {
    const img = document.createElement('img');
    img.src = imageSrc;
    img.classList.add('preview-image');

    const previewBox = document.createElement('div');
    previewBox.classList.add('preview-box');
    previewBox.appendChild(img);

    // Add remove button to preview box
    const removeBtn = document.createElement('button');
    removeBtn.innerHTML = '&times;';
    removeBtn.classList.add('remove-image-btn');
    removeBtn.addEventListener('click', () => previewBox.remove());
    previewBox.appendChild(removeBtn);

    return previewBox;
  };

  /**
   * Converts input files to base64 strings
   * @param {FileList} files - Files to convert
   * @returns {Promise<string[]>} Promise resolving to array of base64 strings
   */
  const convertFilesToBase64 = (files) => {
    const promises = Array.from(files).map(file => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);

        reader.readAsDataURL(file);
      });
    });

    return Promise.all(promises);
  };

  return {
    initialize,
    convertFilesToBase64
  };

})();

/**
 * Car Management Module
 * Handles car data creation and retrieval
 */
const CarModule = (() => {
  /**
   * Initializes the car form submission handler
   */
  const initializeCarForm = () => {
    const addCarForm = document.getElementById("addCarForm");
    const imageInput = document.getElementById("imageInput");
    const saveCarBtn = document.getElementById("saveCarBtn");

    if (!addCarForm || !imageInput || !saveCarBtn) return;

    saveCarBtn.addEventListener("click", (e) => {
      e.preventDefault();
      addCarForm.requestSubmit();
    });

    addCarForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      await handleCarFormSubmission(addCarForm, imageInput);
    });
  };

  /**
   * Handles car form submission
   * @param {HTMLFormElement} form - The car form element
   * @param {HTMLInputElement} imageInput - Image file input element
   */
  const handleCarFormSubmission = async (form, imageInput) => {
    const formData = new FormData(form);
    const files = imageInput.files;

    if (files.length === 0) {
      showNotification('Please select at least one image.', 'error');
      return;
    }

    try {
      const loadingIndicator = document.createElement('div');
      loadingIndicator.id = 'loadingIndicator';
      loadingIndicator.innerHTML = 'Processing images...';
      document.body.appendChild(loadingIndicator);

      // Convert images to base64
      const base64Images = await ImageHandlerModule.convertFilesToBase64(files);
      const getSelectedFeatures = () => {
        const selected = [];
        document.querySelectorAll('input[name="features[]"]:checked').forEach(checkbox => {
          selected.push(checkbox.value);
        });
        return selected; // will return an array
      };



      // Build payload
      const payload = {
        make: formData.get("carMake"),
        model: formData.get("carModel"),
        year: formData.get("carYear"),
        price: formData.get("carPrice"),
        mileage: formData.get("carMileage"),
        fuelType: formData.get("carFuelType"),
        transmission: formData.get("carTransmission"),
        color: formData.get("carColor"),
        features: getSelectedFeatures(),
        bodyType: formData.get("carBodyType"),
        status: formData.get("carStatus"),
        description: formData.get("carDescription"),
        images: base64Images
      };
      console.log('Payload:', payload);
      console.log('Selected features:', getSelectedFeatures());
      console.log("this is my form data ", formData);
      console.log("this is my images", base64Images);

      // Send data to API
      const response = await fetch(`${CONFIG.CARS_API_URL}/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": sessionToken ? `Bearer ${sessionToken}` : ''
        },
        body: JSON.stringify(payload)
      });

      document.body.removeChild(loadingIndicator);

      if (response.ok) {
        showNotification("Car added successfully!", "success");
        form.reset();
        // Clear image previews
        const imagePreview = document.getElementById('imagePreview');
        const addImageBox = document.getElementById('addImageBox');
        if (imagePreview) {
          while (imagePreview.firstChild && imagePreview.firstChild !== addImageBox) {
            imagePreview.removeChild(imagePreview.firstChild);
          }
        }
      } else {
        const errorData = await response.json();
        console.error(errorData);
        showNotification("Failed to add car. Please try again.", "error");
      }
    } catch (error) {
      console.error("Error:", error);
      showNotification("Something went wrong. Please try again later.", "error");
    }
  };

  /**
   * Fetches and displays car features
   */
  document.addEventListener('DOMContentLoaded', () => {
    const loadCarFeatures = async () => {
      const featuresContainer = document.getElementById('featuresContainer');
      if (!featuresContainer) {
        console.error('No featuresContainer found');
        return;
      }

      try {
        const response = await fetch(`${CONFIG.CARS_API_URL}/get-car-feature`);
        if (!response.ok) throw new Error('Failed to fetch features');

        const data = await response.json();
        const features = data.entity || []; // <-- THIS LINE FIXED
        console.log('Fetched features:', features);

        featuresContainer.innerHTML = ''; // Clear container first

        features.forEach(feature => {
          const label = document.createElement('label');
          label.classList.add(
            'flex', 'items-center', 'space-x-2',
            'bg-gray-100', 'border', 'border-gray-300',
            'p-4', 'rounded-md', 'cursor-pointer'
          );

          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.name = 'features[]';
          checkbox.value = feature;

          const span = document.createElement('span');
          span.textContent = feature;

          label.appendChild(checkbox);
          label.appendChild(span);
          featuresContainer.appendChild(label);
        });
      } catch (error) {
        console.error('Error fetching features:', error);
        featuresContainer.innerHTML = '<p class="text-red-500">Failed to load features</p>';
      }
    };

    loadCarFeatures();
  });



  return {
    initializeCarForm,

  };
})();

/**
 * UI Utilities Module
 * Handles general UI interactions
 */
const UIModule = (() => {
  /**
   * Initializes UI event handlers
   */
  const initialize = () => {
    initializePasswordToggle();
    initializeLogoutButton();
  };

  /**
   * Sets up password visibility toggle
   */
  const initializePasswordToggle = () => {
    const togglePassword = document.getElementById('togglePassword');

    if (togglePassword) {
      togglePassword.addEventListener('click', function () {
        const passwordInput = document.getElementById('password');
        if (passwordInput) {
          const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
          passwordInput.setAttribute('type', type);
          this.classList.toggle('fa-eye');
          this.classList.toggle('fa-eye-slash');
        }
      });
    }
  };

  /**
   * Sets up logout button handler
   */
  const initializeLogoutButton = () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        AuthModule.logout();
      });
    }
  };

  return {
    initialize
  };
})();

/**
 * Shows a notification message
 * @param {string} message - Message to display
 * @param {string} type - Message type ('success', 'error', 'info')
 */
function showNotification(message, type = 'info') {
  // Remove existing notification
  const existingNotification = document.getElementById('notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  // Create new notification
  const notification = document.createElement('div');
  notification.id = 'notification';
  notification.className = `notification ${type}`;
  notification.textContent = message;

  // Add close button
  const closeBtn = document.createElement('span');
  closeBtn.innerHTML = '&times;';
  closeBtn.className = 'notification-close';
  closeBtn.onclick = () => notification.remove();
  notification.appendChild(closeBtn);

  // Add to document
  document.body.appendChild(notification);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (document.body.contains(notification)) {
      notification.remove();
    }
  }, 5000);
}


// fetch car features from the API and display them in the table
document.addEventListener('DOMContentLoaded', function () {
  const tableBody = document.getElementById('recentCarsTable');
  const baseUrl = 'http://localhost:8080/api/v1/cars';

  fetch(baseUrl + '/get-cars')
    .then(response => response.json())
    .then(data => {
      tableBody.innerHTML = '';

      if (data.entity && data.entity.length > 0) {
        data.entity.forEach((car) => {
          const row = document.createElement('tr');
          const idCell = document.createElement('td');
          idCell.textContent = car.id || (index + 1); // Prefer car.id, else use index
          row.appendChild(idCell);

          // Image cell
          const imgCell = document.createElement('td');
          const img = document.createElement('img');
          if (car.images && car.images.length > 0) {
            // Assuming `car.images[0].imageData` contains base64 data with prefix like "data:image/jpeg;base64,..."
            img.src = car.images[0].imageData;
            img.alt = 'Car Image';
            img.style.width = '100px'; // Adjust width as needed
            img.style.height = 'auto'; // Maintain aspect ratio
            imgCell.appendChild(img);
          } else {
            imgCell.textContent = 'No image';
          }
          imgCell.appendChild(img);
          row.appendChild(imgCell);

          // Model cell
          const modelCell = document.createElement('td');
          modelCell.textContent = car.model || '';
          row.appendChild(modelCell);

          // Year cell
          const yearCell = document.createElement('td');
          yearCell.textContent = car.year || '';
          row.appendChild(yearCell);

          // Price cell
          const priceCell = document.createElement('td');

          if (car.price) {
            const numericPrice = Number(car.price.replace(/[^0-9.-]+/g, '')); // Remove non-numeric chars if any
            priceCell.textContent = numericPrice.toLocaleString('en-US');
          } else {
            priceCell.textContent = '';
          }

          row.appendChild(priceCell);


          // Status cell
          const statusCell = document.createElement('td');
          statusCell.textContent = car.status || '';
          row.appendChild(statusCell);

          // Added Date cell
          const addedDateCell = document.createElement('td');
          addedDateCell.textContent = new Date().toLocaleDateString();
          row.appendChild(addedDateCell);

          // Actions cell
          const actionsCell = document.createElement('td');

          // View button
          const viewButton = document.createElement('button');
          viewButton.className = 'btn btn-info btn-sm me-1';
          viewButton.innerHTML = '<i class="fas fa-eye"></i>';
          viewButton.addEventListener('click', function () {
            handleView(car);
          });

          // Edit button
          const editButton = document.createElement('button');
          editButton.className = 'btn btn-warning btn-sm me-1';
          editButton.innerHTML = '<i class="fas fa-edit"></i>';
          editButton.addEventListener('click', function () {
            handleEdit(car);
          });

          // Delete button
          const deleteButton = document.createElement('button');
          deleteButton.className = 'btn btn-danger btn-sm';
          deleteButton.innerHTML = '<i class="fas fa-trash"></i>';

          deleteButton.addEventListener('click', function () {
            handleDelete(car);
          });

          actionsCell.appendChild(viewButton);
          actionsCell.appendChild(editButton);
          actionsCell.appendChild(deleteButton);
          row.appendChild(actionsCell);

          tableBody.appendChild(row);
        });
      } else {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 7;
        cell.className = 'text-center';
        cell.textContent = 'No cars found.';
        row.appendChild(cell);
        tableBody.appendChild(row);
      }
    })
    .catch(error => {
      console.error('Error fetching cars:', error);
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 7;
      cell.className = 'text-center text-danger';
      cell.textContent = 'Failed to load cars.';
      row.appendChild(cell);
      tableBody.appendChild(row);
    });


  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
                ${message}
                <span class="notification-close" onclick="this.parentElement.remove()">×</span>
            `;
    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }


  // VIEW Car
  function handleView(car) {
    const carId = car.id;
    console.log('car object:', car);

    // Redirect to car.html with the car ID in the URL
    window.location.href = `cars.html?carId=${carId}`;
  }


  function handleView(car) {
    const carId = car.id;
    console.log('car object:', car);

    // Redirect to car.html with the car ID in the URL
    window.location.href = `cars.html?carId=${carId}`;
  }

  // Extract carId from the URL
  const urlParams = new URLSearchParams(window.location.search);
  const carId = urlParams.get('carId');

  if (carId) {
    fetch(`${baseUrl}/get-car/${carId}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        console.log('Car details:', data);

        const car = data.entity;
        console.log('Car object:', car);

        // Update page title
        document.title = `${car.make} ${car.model} | CarSoko`;

        // Populate car title and brief info
        document.getElementById('carMake').textContent = car.make || 'N/A';
        document.getElementById('carModel').textContent = car.model || 'N/A';
        document.getElementById('carFuel').textContent = car.fuelType || 'N/A';
        document.getElementById('carYear').textContent = car.year || 'N/A';
        document.getElementById('carBodyType').textContent = car.bodyType || 'N/A';
        document.getElementById('carDoors').textContent = car.doors ? `${car.doors} Doors` : 'N/A';
        document.getElementById('carColor').textContent = car.color || 'N/A';

        // Format price (assuming Kenyan Shillings)
        document.getElementById('carPrice').textContent = car.price
          ? `Kshs ${parseInt(car.price).toLocaleString()}`
          : 'Price on request';

        // Populate detail table
        document.getElementById('detailMake').textContent = car.make || 'N/A';
        document.getElementById('detailModel').textContent = car.model || 'N/A';
        document.getElementById('detailColor').textContent = car.color || 'N/A';
        document.getElementById('detailDriveType').textContent = car.driveType || 'N/A';
        document.getElementById('detailTransmission').textContent = car.transmission || 'N/A';
        document.getElementById('detailCondition').textContent = car.condition || 'N/A';
        document.getElementById('detailYear').textContent = car.year || 'N/A';
        document.getElementById('detailFuel').textContent = car.fuelType || 'N/A';
        document.getElementById('detailEngine').textContent = car.engineSize || 'N/A';
        document.getElementById('detailMileage').textContent = car.mileage ? `${car.mileage.toLocaleString()} km` : 'N/A';
        document.getElementById('detailDoors').textContent = car.doors || 'N/A';
        document.getElementById('detailStatus').textContent = car.status || '--';
        document.getElementById('carVIN').textContent = car.vin || 'Unregistered';
        document.getElementById('carId').textContent = car.id || 'N/A';

        // Car status badge
        document.getElementById('carStatus').textContent = car.status || 'Available';

        // Description
        document.getElementById('carDescription').textContent = car.description || 'No description available for this vehicle.';

        // Handle features
        const featuresContainer = document.getElementById('carFeatures');
        if (car.features && car.features.length > 0) {
          featuresContainer.innerHTML = '';
          car.features.forEach(feature => {
            const featureItem = document.createElement('div');
            featureItem.className = 'feature-item';
            featureItem.textContent = feature.featureName; // <-- fixed here
            featuresContainer.appendChild(featureItem);
          });
        } else {
          featuresContainer.innerHTML = '<div class="feature-item">No features available</div>';
        }
        console.log('Car features:', car.features);


        // Handle image
        // Function to display image from base64 data
        function displayCarImages(imagesArray) {
          const carGallery = document.querySelector('.car-gallery');
          const imagePlaceholder = document.getElementById('imagePlaceholder');

          // Clear previous images except the placeholder
          const existingImages = carGallery.querySelectorAll('img:not(#carImage)');
          existingImages.forEach(img => img.remove());

          // Hide original image element
          const originalImage = document.getElementById('carImage');
          originalImage.style.display = 'none';

          if (imagesArray.length === 0) {
            console.log('No images to display');
            imagePlaceholder.style.display = 'flex'; // Show placeholder
            return;
          }

          // Hide placeholder
          imagePlaceholder.style.display = 'none';

          // Create thumbnail container if it doesn't exist
          let thumbnailContainer = carGallery.querySelector('.car-thumbnails');
          if (!thumbnailContainer) {
            thumbnailContainer = document.createElement('div');
            thumbnailContainer.className = 'car-thumbnails';
            carGallery.appendChild(thumbnailContainer);
          } else {
            thumbnailContainer.innerHTML = ''; // Clear existing thumbnails
          }

          // Create main image display
          const mainImageDisplay = document.createElement('div');
          mainImageDisplay.className = 'car-main-image';

          const mainImage = document.createElement('img');
          mainImage.src = imagesArray[0].imageData; // First image as default
          mainImage.alt = 'Car Main Image';
          mainImage.className = 'main-car-image';

          mainImageDisplay.appendChild(mainImage);

          // Insert main image at the beginning
          if (carGallery.firstChild) {
            carGallery.insertBefore(mainImageDisplay, carGallery.firstChild);
          } else {
            carGallery.appendChild(mainImageDisplay);
          }

          // Create thumbnails
          imagesArray.forEach((image, index) => {
            if (image.imageData) {
              const thumbnail = document.createElement('div');
              thumbnail.className = 'car-thumbnail';
              if (index === 0) {
                thumbnail.className += ' active'; // Mark first thumbnail as active
              }

              const thumbImg = document.createElement('img');
              thumbImg.src = image.imageData;
              thumbImg.alt = `Car Image ${index + 1}`;
              thumbImg.dataset.imageId = image.id;

              // Click event to switch main image
              thumbnail.addEventListener('click', () => {
                mainImage.src = image.imageData;

                // Update active thumbnail
                document.querySelectorAll('.car-thumbnail').forEach(thumb => {
                  thumb.classList.remove('active');
                });
                thumbnail.classList.add('active');
              });

              thumbnail.appendChild(thumbImg);
              thumbnailContainer.appendChild(thumbnail);
            }
          });

          console.log(`Displayed ${imagesArray.length} car images`);
        }

        // Function to fetch and process images
        function fetchCarImages(carId) {
          fetch(`http://localhost:8080/api/v1/cars/${carId}/images`)
            .then(response => response.json())
            .then(data => {
              if (data.statusCode === 200 && data.entity && data.entity.images) {
                displayCarImages(data.entity.images);
              } else {
                console.log('Invalid response format or no images array');
                // Show placeholder if no images
                document.getElementById('imagePlaceholder').style.display = 'flex';
              }
            })
            .catch(error => {
              console.error('Error fetching car images:', error);
              // Show placeholder on error
              document.getElementById('imagePlaceholder').style.display = 'flex';
            });
        }

        // Process images from already received response
        function processCarImagesResponse(response) {
          if (response.statusCode === 200 &&
            response.entity &&
            response.entity.images) {
            displayCarImages(response.entity.images);
          } else {
            console.log('Invalid response format or no images array');
            // Show placeholder if no images
            document.getElementById('imagePlaceholder').style.display = 'flex';
          }
        }
        fetchCarImages(carId);


        // Update status banner
        document.getElementById('statusMessage').textContent = 'Car details loaded successfully';
        document.getElementById('statusCode').textContent = '✓';
        document.querySelector('.status-banner').classList.add('success');
      })
      .catch(error => {
        console.error('Error retrieving car details:', error);
        document.getElementById('statusMessage').textContent = 'Failed to load car details';
        document.getElementById('statusCode').textContent = '✗';
        document.querySelector('.status-banner').classList.add('error');
      });
  } else {
    console.log('Car ID not found in URL');
    document.getElementById('statusMessage').textContent = 'No car ID provided';
    document.getElementById('statusCode').textContent = '!';
    document.querySelector('.status-banner').classList.add('warning');
  }




  // EDIT Car
  function handleEdit(car) {
    const carId = car.id; // Assuming car has an id
    // For example: redirect to edit page
    window.location.href = `/edit-car.html?id=${carId}`;

    // OR if you prefer direct API call for editing:
    /*
    fetch(`${baseUrl}/edit/${carId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'New Model',
            price: 'New Price',
            // other fields...
        }),
    })
    .then(response => response.json())
    .then(data => {
        console.log('Car edited successfully:', data);
        alert('Car edited successfully');
    })
    .catch(error => {
        console.error('Error editing car:', error);
        alert('Failed to edit car.');
    });
    */
  }

  function showPopupConfirmation(car, callback) {
    const popup = document.createElement('div');
    popup.className = 'popup-confirmation';
    popup.innerHTML = `
          <div class="popup-content">
              <p>Are you sure you want to delete ${car.model} (${car.year})?</p>
              <button id="popup-confirm-yes">Yes</button>
              <button id="popup-confirm-no">No</button>
          </div>
      `;

    document.body.appendChild(popup);

    document.getElementById('popup-confirm-yes').addEventListener('click', () => {
      callback(true);
      popup.remove();
    });

    document.getElementById('popup-confirm-no').addEventListener('click', () => {
      callback(false);
      popup.remove();
    });
  }



  // DELETE Car
  function handleDelete(car) {
    showPopupConfirmation(car, (confirmDelete) => {
      if (confirmDelete) {
        fetch(`${baseUrl}/delete/${car.id}`, {
          method: 'DELETE',
        })
          .then(response => {
            if (response.ok) {
              showNotification('Car deleted successfully!', 'success');
              setTimeout(() => {
                location.reload(); // Reload after showing notification
              }, 1500); // Wait 1.5 seconds before reload
            } else {
              throw new Error('Delete failed');
            }
          })
          .catch(error => {
            console.error('Error deleting car:', error);
            showNotification('Failed to delete car.', 'error');
          });
      } else {
        showNotification('Delete operation cancelled.', 'info');
      }
    });
  }



});


/**
 * Initialize everything when DOM content is loaded
 */
document.addEventListener('DOMContentLoaded', function () {
  // Detect current page
  const isLoginPage = document.getElementById('loginForm') !== null;
  const isAdminPage = document.getElementById('adminDashboard') !== null;
  const isCarFormPage = document.getElementById('addCarForm') !== null;

  // Initialize UI components
  UIModule.initialize();

  // Initialize login form if on login page
  if (isLoginPage) {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const rememberCheckbox = document.getElementById('remember');

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        const rememberMe = rememberCheckbox ? rememberCheckbox.checked : false;

        // Reset previous alert messages
        const alertMessage = document.getElementById('alertMessage');
        if (alertMessage) alertMessage.style.display = 'none';

        if (!username || !password) {
          showNotification('Please enter both username and password.', 'error');
          return;
        }

        const result = await AuthModule.handleLogin(username, password, rememberMe);

        if (result.success) {
          showNotification(result.message, 'success');

          // Redirect after short delay
          setTimeout(function () {
            window.location.href = 'admin.html';
          }, CONFIG.REDIRECT_DELAY);
        } else {
          showNotification(result.message, 'error');
          if (passwordInput) passwordInput.value = '';
        }
      });
    }
  }
  // Check authentication for admin pages
  else if (isAdminPage) {
    AuthModule.checkAuthentication();
  }

  // Initialize image handler
  ImageHandlerModule.initialize();

  // Initialize car form if on car form page
  if (isCarFormPage) {
    CarModule.initializeCarForm();
  }

  // Load car features on pages that need them
  if (document.getElementById('featuresContainer')) {
    CarModule.loadCarFeatures();
  }
});


//rendering car count
async function fetchCarCount() {
  try {
    const response = await fetch('http://localhost:8080/api/v1/cars/get-car-count'); // Replace with your actual endpoint
    const data = await response.json();

    if (response.ok && data.statusCode === 200) {
      document.getElementById('totalCars').textContent = data.entity;
    } else {
      document.getElementById('totalCars').textContent = 'Error';
      console.error('Failed to fetch car count:', data.message);
    }
  } catch (error) {
    document.getElementById('totalCars').textContent = 'Error';
    console.error('Error fetching car count:', error);
  }
}

// Call function on page load
window.addEventListener('DOMContentLoaded', fetchCarCount);

// Add CSS for notifications
const style = document.createElement('style');
style.textContent = `
    .notification {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 5px;
      color: white;
      max-width: 300px;
      z-index: 9999;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      animation: slideIn 0.3s ease-out;
    }
    
    .notification.success {
      background-color: #28a745;
    }
    
    .notification.error {
      background-color: #dc3545;
    }
    
    .notification.info {
      background-color: #17a2b8;
    }
    
    .notification-close {
      margin-left: 10px;
      cursor: pointer;
      float: right;
      font-weight: bold;
    }
    
    #loadingIndicator {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0,0,0,0.5);
      color: white;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 20px;
      z-index: 9999;
    }
    
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    .remove-image-btn {
      position: absolute;
      top: 5px;
      right: 5px;
      background: rgba(255,0,0,0.7);
      color: white;
      border: none;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      line-height: 18px;
      cursor: pointer;
    }
    
    .preview-box {
      position: relative;
      margin: 5px;
    }
      .popup-confirmation {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 20px;
        border-radius: 5px;
        text-align: center;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    }

    .popup-content p {
        margin-bottom: 20px;
    }

    .popup-content button {
        margin: 5px;
        padding: 10px 15px;
        background-color: #28a745;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
    }

    .popup-content button:hover {
        background-color: #218838;
    }

    .popup-content #popup-confirm-no {
        background-color: #dc3545;
    }

    .popup-content #popup-confirm-no:hover {
        background-color: #c82333;
    }
  `;
document.head.appendChild(style);