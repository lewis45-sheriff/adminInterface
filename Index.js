/**
 * Auto Elite Admin Dashboard
 * Main JavaScript file for handling authentication, dashboard, and car management
 */

// Global Configuration
const CONFIG = {
    API_BASE_URL: 'https://your-api-endpoint.com/api',
    LOCAL_API_URL: 'http://localhost:8080/api/v1',
    REDIRECT_DELAY: 1500
  };
  
  // Global state variables
  let uploadedFiles = [];
  let salesChart;
  let sessionToken = localStorage.getItem('sessionToken') || null;
  let userData = JSON.parse(localStorage.getItem('userData')) || null;
  
  /**
   * Authentication Module
   * Handles login, session management, and authentication state
   */
  const AuthModule = (() => {
    const checkLoginStatus = () => {
      const isLoggedIn = localStorage.getItem('autoEliteLoggedIn') || sessionStorage.getItem('autoEliteLoggedIn');
      if (isLoggedIn === 'false') {
        window.location.href = 'Login.html';
      }
    };
  
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
          
          // Return result for further handling
          return { success: true, message: 'Login successful! Redirecting...' };
        } else {
          return { success: false, message: result.message || 'Invalid username or password. Please try again.' };
        }
      } catch (error) {
        console.error('Login error:', error);
        return { success: false, message: 'An error occurred. Please try again later.' };
      }
    };
  
    const logout = () => {
      localStorage.removeItem('autoEliteLoggedIn');
      sessionStorage.removeItem('autoEliteLoggedIn');
      localStorage.removeItem('autoEliteUser');
      sessionStorage.removeItem('autoEliteUser');
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('userData');
      window.location.href = 'login.html';
    };
  
    const checkAuthentication = () => {
      if (!sessionToken) {
        window.location.href = 'login.html';
        return false;
      }
      
      // Update user info in header
      if (userData) {
        const userNameElement = document.getElementById('username');
        const userRoleElement = document.getElementById('userRole');
        const userAvatarElement = document.getElementById('userAvatar');
        
        if (userNameElement) userNameElement.textContent = userData.name || 'Admin User';
        if (userRoleElement) userRoleElement.textContent = userData.role || 'Administrator';
        if (userAvatarElement && userData.avatar) userAvatarElement.src = userData.avatar;
      }
      
      return true;
    };
  
    return {
      checkLoginStatus,
      handleLogin,
      logout,
      checkAuthentication
    };
  })();
  
  /**
   * UI Utilities Module
   * Handles common UI operations like loaders, alerts, and formatting
   */
  const UIUtils = (() => {
    const showLoader = () => {
      const loaderOverlay = document.getElementById('loaderOverlay');
      if (loaderOverlay) {
        loaderOverlay.style.display = 'flex';
        loaderOverlay.style.opacity = '1';
      }
    };
  
    const hideLoader = () => {
      const loaderOverlay = document.getElementById('loaderOverlay');
      if (loaderOverlay) {
        loaderOverlay.style.opacity = '0';
        setTimeout(() => {
          loaderOverlay.style.display = 'none';
        }, 300);
      }
    };
  
    const showAlert = (message, type = 'success', element = null) => {
      const alertElement = element || document.getElementById('alertMessage');
      if (alertElement) {
        alertElement.textContent = message;
        alertElement.className = 'alert ' + type;
        alertElement.style.display = 'block';
  
        // Auto-hide for status messages
        if (!element) {
          setTimeout(() => {
            alertElement.style.display = 'none';
          }, 5000);
        }
      }
    };
  
    const showStatusMessage = (message, type = 'success') => {
      const statusMessageArea = document.getElementById('statusMessageArea');
      if (statusMessageArea) {
        statusMessageArea.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
          statusMessageArea.innerHTML = '';
        }, 5000);
      }
    };
  
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
    };
  
    const getBadgeClass = (status) => {
      switch(status.toLowerCase()) {
        case 'available': return 'badge-success';
        case 'reserved': return 'badge-warning';
        case 'sold': return 'badge-danger';
        case 'maintenance': return 'badge-warning';
        default: return 'badge-secondary';
      }
    };
  
    return {
      showLoader,
      hideLoader,
      showAlert,
      showStatusMessage,
      formatCurrency,
      getBadgeClass
    };
  })();
  
  /**
   * API Service Module
   * Handles all API requests
   */
  const APIService = (() => {
    const request = async (endpoint, method = 'GET', data = null, includeFiles = false) => {
      try {
        const headers = {
          'Authorization': `Bearer ${sessionToken}`
        };
        
        let requestOptions = {
          method,
          headers
        };
        
        if (data) {
          if (includeFiles) {
            // For multipart/form-data (file uploads)
            const formData = new FormData();
            
            // Add all form fields to FormData
            Object.keys(data).forEach(key => {
              if (Array.isArray(data[key])) {
                data[key].forEach(item => formData.append(`${key}[]`, item));
              } else {
                formData.append(key, data[key]);
              }
            });
            
            // Add files
            uploadedFiles.forEach((file, index) => {
              formData.append(`carImages[${index}]`, file);
            });
            
            requestOptions.body = formData;
            // Don't set Content-Type for FormData, browser will set it with boundary
          } else {
            // For JSON data
            requestOptions.headers['Content-Type'] = 'application/json';
            requestOptions.body = JSON.stringify(data);
          }
        }
        
        const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, requestOptions);
        
        // Handle HTTP errors
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
        }
        
        // Check for no-content responses
        if (response.status === 204) {
          return null;
        }
        
        return await response.json();
      } catch (error) {
        console.error('API Request Error:', error);
        throw error;
      }
    };
  
    const loadDashboardStats = async () => {
      try {
        const stats = await request('/dashboard/stats');
        
        const elements = {
          totalCars: document.getElementById('totalCars'),
          totalViews: document.getElementById('totalViews'),
          pendingOrders: document.getElementById('pendingOrders'),
          totalRevenue: document.getElementById('totalRevenue')
        };
        
        if (elements.totalCars) elements.totalCars.textContent = stats.totalCars || '0';
        if (elements.totalViews) elements.totalViews.textContent = stats.totalViews || '0';
        if (elements.pendingOrders) elements.pendingOrders.textContent = stats.pendingOrders || '0';
        if (elements.totalRevenue) elements.totalRevenue.textContent = UIUtils.formatCurrency(stats.totalRevenue || 0);
      } catch (error) {
        console.error('Failed to load dashboard stats:', error);
        // Use fallback data
        const fallbackStats = {
          totalCars: '124',
          totalViews: '8,567',
          pendingOrders: '12',
          totalRevenue: '$254,120'
        };
        
        const elements = {
          totalCars: document.getElementById('totalCars'),
          totalViews: document.getElementById('totalViews'),
          pendingOrders: document.getElementById('pendingOrders'),
          totalRevenue: document.getElementById('totalRevenue')
        };
        
        if (elements.totalCars) elements.totalCars.textContent = fallbackStats.totalCars;
        if (elements.totalViews) elements.totalViews.textContent = fallbackStats.totalViews;
        if (elements.pendingOrders) elements.pendingOrders.textContent = fallbackStats.pendingOrders;
        if (elements.totalRevenue) elements.totalRevenue.textContent = fallbackStats.totalRevenue;
      }
    };
  
    const loadCarMakes = async () => {
      try {
        const makes = await request('/car-makes');
        const makeSelect = document.getElementById('carMake');
        
        if (makeSelect) {
          // Clear existing options except the first one
          makeSelect.innerHTML = '<option value="">Select Make</option>';
          
          // Add makes from API
          makes.forEach(make => {
            const option = document.createElement('option');
            option.value = make.id;
            option.textContent = make.name;
            makeSelect.appendChild(option);
          });
        }
      } catch (error) {
        console.error('Failed to load car makes:', error);
        // Use fallback data
        const fallbackMakes = ['Toyota', 'Honda', 'BMW', 'Mercedes', 'Audi', 'Ford', 'Chevrolet', 'Other'];
        const makeSelect = document.getElementById('carMake');
        
        if (makeSelect) {
          makeSelect.innerHTML = '<option value="">Select Make</option>';
          fallbackMakes.forEach(make => {
            const option = document.createElement('option');
            option.value = make;
            option.textContent = make;
            makeSelect.appendChild(option);
          });
        }
      }
    };
    
    return {
      request,
      loadDashboardStats,
      loadCarMakes
    };
  })();
  
  /**
   * Event Handlers Module
   * Sets up event listeners for various UI elements
   */
  const EventHandlers = (() => {
    // Login page event handlers
    const setupLoginHandlers = () => {
      const loginForm = document.getElementById('loginForm');
      const togglePassword = document.getElementById('togglePassword');
      
      if (togglePassword) {
        togglePassword.addEventListener('click', function() {
          const passwordInput = document.getElementById('password');
          if (passwordInput) {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
          }
        });
      }
      
      if (loginForm) {
        loginForm.addEventListener('submit', async function(event) {
          event.preventDefault();
          
          const usernameInput = document.getElementById('username');
          const passwordInput = document.getElementById('password');
          const rememberCheckbox = document.getElementById('remember');
          
          const username = usernameInput.value.trim();
          const password = passwordInput.value.trim();
          const rememberMe = rememberCheckbox ? rememberCheckbox.checked : false;
          
          // Reset previous alert messages
          UIUtils.showAlert('', 'alert', document.getElementById('alertMessage'));
          
          if (!username || !password) {
            UIUtils.showAlert('Please enter both username and password.', 'error', document.getElementById('alertMessage'));
            return;
          }
          
          const result = await AuthModule.handleLogin(username, password, rememberMe);
          
          if (result.success) {
            UIUtils.showAlert(result.message, 'success', document.getElementById('alertMessage'));
            
            // Redirect after short delay
            setTimeout(function() {
              window.location.href = 'admin.html';
            }, CONFIG.REDIRECT_DELAY);
          } else {
            UIUtils.showAlert(result.message, 'error', document.getElementById('alertMessage'));
            if (passwordInput) passwordInput.value = '';
          }
        });
      }
      
      // Form input animation
      const inputs = document.querySelectorAll('input');
      inputs.forEach(input => {
        input.addEventListener('focus', function() {
          if (this.parentElement) {
            this.parentElement.style.borderColor = '#2e77f2';
          }
        });
  
        input.addEventListener('blur', function() {
          if (this.parentElement) {
            this.parentElement.style.borderColor = '';
          }
        });
      });
    };
  
    // Admin page event handlers
    const setupAdminHandlers = () => {
      const logoutBtn = document.getElementById('logoutBtn');
    //   const addCarForm = document.getElementById('addCarForm');
      const fileUpload = document.getElementById('fileUpload');
      const addImageBox = document.getElementById('addImageBox');
      
      if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
          e.preventDefault();
          AuthModule.logout();
        });
      }
      
     
      
      if (addImageBox && fileUpload) {
        addImageBox.addEventListener('click', () => {
          fileUpload.click();
        });
        
        fileUpload.addEventListener('change', (e) => {
          // Image handling logic would go here
          if (e.target.files.length > 0) {
            UIUtils.showStatusMessage('Images uploaded!', 'success');
          }
        });
      }
    };
    
    return {
      setupLoginHandlers,
      setupAdminHandlers
    };
  })();
  
  /**
   * Initialize application based on current page
   */
  document.addEventListener('DOMContentLoaded', function() {
    // Determine current page
    const isLoginPage = document.getElementById('loginForm') !== null;
    const isAdminPage = document.getElementById('adminDashboard') !== null;
    
    if (isLoginPage) {
      // Set up login page
      AuthModule.checkLoginStatus();
      EventHandlers.setupLoginHandlers();
    } else if (isAdminPage) {
      // Set up admin dashboard
      if (AuthModule.checkAuthentication()) {
        APIService.loadDashboardStats();
        APIService.loadCarMakes();
        EventHandlers.setupAdminHandlers();
      }
    }
    //add images from file upload
    const addImageBox = document.getElementById('addImageBox');
    const imageInput = document.getElementById('imageInput');
    const imagePreview = document.getElementById('imagePreview');

    // When the '+' is clicked, open the file picker
    addImageBox.addEventListener('click', () => {
        imageInput.click();
    });

    // When images are selected
    imageInput.addEventListener('change', (event) => {
        const files = event.target.files;

        if (files.length > 0) {
            for (const file of files) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.classList.add('preview-image'); // Style as needed
                    const previewBox = document.createElement('div');
                    previewBox.classList.add('preview-box');
                    previewBox.appendChild(img);
                    imagePreview.insertBefore(previewBox, addImageBox);
                }
                reader.readAsDataURL(file);
            }
        }
    });

// add car to the database

document.addEventListener("DOMContentLoaded", function () {
    const addCarForm = document.getElementById("addCarForm");
    const imageInput = document.getElementById("imageInput");
    const saveCarBtn = document.getElementById("saveCarBtn");

    saveCarBtn.addEventListener("click", function (e) {
        e.preventDefault();
        addCarForm.requestSubmit();
    });

    addCarForm.addEventListener("submit", function (e) {
        e.preventDefault();

        const formData = new FormData(addCarForm); // You can still use FormData to quickly gather other fields

        const imagesArray = [];
        const files = imageInput.files;

        if (files.length > 0) {
            const readers = [];

            for (let i = 0; i < files.length; i++) {
                readers.push(new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = function (e) {
                        resolve(e.target.result); // Base64 string
                    };
                    reader.onerror = function (e) {
                        reject(e);
                    };
                    reader.readAsDataURL(files[i]);
                }));
            }

            // Wait until all images are converted
            Promise.all(readers)
                .then(base64Images => {
                    // Now all images are base64 strings
                    const payload = {
                        make: formData.get("carMake"),
                        model: formData.get("carModel"),
                        year: formData.get("carYear"),
                        price: formData.get("carPrice"),
                        mileage: formData.get("carMileage"),
                        fuelType: formData.get("carFuelType"),
                        transmission: formData.get("carTransmission"),
                        color: formData.get("carColor"),
                        bodyType: formData.get("carBodyType"),
                        status: formData.get("carStatus"),
                        description: formData.get("carDescription"),
                        images: base64Images // <--- this is a list of strings
                    };
                    console.log(payload); // For debugging
                    console.log(formData)

                    // Send JSON (not FormData anymore)
                    fetch("/api/cars", { // <-- Your Spring Boot endpoint
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(payload)
                    })
                    .then(response => {
                        if (response.ok) {
                            alert("Car added successfully!");
                            addCarForm.reset();
                        } else {
                            return response.json().then(errorData => {
                                console.error(errorData);
                                alert("Failed to add car. Please try again.");
                            });
                        }
                    })
                    .catch(error => {
                        console.error("Error:", error);
                        alert("Something went wrong. Please try again later.");
                    });
                })
                .catch(error => {
                    console.error("Error reading files:", error);
                    alert("Failed to read images. Please try again.");
                });
        } else {
            alert("Please select at least one image.");
        }
    });
});
});

