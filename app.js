// SmileCare Dental Clinic - Multi-Page Interactive Features

document.addEventListener('DOMContentLoaded', function() {
    // Page Management System
    const pages = {
        'home': {
            title: 'SmileCare Dental Clinic - Complete Dental Care | Professional Dentists',
            description: 'SmileCare Dental Clinic offers comprehensive dental services including general dentistry, cosmetic treatments, orthodontics, and emergency care.'
        },
        'services': {
            title: 'Dental Services - SmileCare Dental Clinic',
            description: 'Comprehensive dental services including general dentistry, cosmetic treatments, restorative dentistry, and orthodontics at SmileCare Dental Clinic.'
        },
        'about': {
            title: 'Our Expert Dental Team - SmileCare Dental Clinic',
            description: 'Meet our experienced dental professionals at SmileCare Dental Clinic. Expert dentists specializing in general, cosmetic, and pediatric dentistry.'
        },
        'testimonials': {
            title: 'Patient Reviews & Testimonials - SmileCare Dental Clinic',
            description: 'Read real patient experiences and testimonials from SmileCare Dental Clinic. Discover why patients trust us with their dental care.'
        },
        'contact': {
            title: 'Contact SmileCare Dental Clinic - Location & Hours',
            description: 'Contact SmileCare Dental Clinic. Find our location, office hours, phone number, and send us a message. We are here to help with your dental needs.'
        },
        'appointment': {
            title: 'Schedule Appointment - SmileCare Dental Clinic',
            description: 'Book your dental appointment online at SmileCare Dental Clinic. Easy scheduling with flexible times to accommodate your busy lifestyle.'
        }
    };

    let currentPage = 'home';

    // Mobile Menu Toggle
    const mobileToggle = document.getElementById('mobileToggle');
    const navMenu = document.getElementById('navMenu');
    
    mobileToggle.addEventListener('click', function() {
        navMenu.classList.toggle('active');
        mobileToggle.classList.toggle('active');
    });

    // Page Navigation System
    function showPage(pageId) {
        // Hide all pages
        const allPages = document.querySelectorAll('.page');
        allPages.forEach(page => {
            page.classList.remove('active');
        });

        // Show target page
        const targetPage = document.getElementById(pageId + '-page');
        if (targetPage) {
            targetPage.classList.add('active');
            currentPage = pageId;
            
            // Update URL hash
            window.history.pushState({page: pageId}, '', '#' + pageId);
            
            // Update page title and meta description
            if (pages[pageId]) {
                document.title = pages[pageId].title;
                document.getElementById('pageDescription').content = pages[pageId].description;
            }
            
            // Update active nav link
            updateActiveNavLink(pageId);
            
            // Close mobile menu if open
            navMenu.classList.remove('active');
            mobileToggle.classList.remove('active');
            
            // Scroll to top
            window.scrollTo(0, 0);
            
            // Initialize page-specific features
            initializePageFeatures(pageId);
        }
    }

    function updateActiveNavLink(pageId) {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-page') === pageId || 
                (pageId === 'home' && link.getAttribute('href') === '#home')) {
                link.classList.add('active');
            }
        });
    }

    // Handle navigation clicks
    function handleNavigation() {
        const navLinks = document.querySelectorAll('a[data-page], a[href^="#"]');
        
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                
                const targetPage = this.getAttribute('data-page') || 
                                 this.getAttribute('href').substring(1);
                
                if (pages[targetPage] || targetPage === 'home') {
                    showPage(targetPage === 'home' ? 'home' : targetPage);
                }
            });
        });
    }

    // Initialize page features based on current page
    function initializePageFeatures(pageId) {
        switch(pageId) {
            case 'testimonials':
                initializeTestimonialsFilter();
                break;
            case 'appointment':
                initializeAppointmentForm();
                break;
            case 'contact':
                initializeContactForm();
                break;
            case 'home':
                // Any home page specific initialization
                break;
        }
    }

    // Testimonials Filter System
    function initializeTestimonialsFilter() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        const testimonialCards = document.querySelectorAll('.testimonial-detailed-card');

        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Update active button
                filterButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');

                const filterValue = this.getAttribute('data-filter');

                // Filter testimonials
                testimonialCards.forEach(card => {
                    if (filterValue === 'all') {
                        card.classList.remove('hidden');
                    } else {
                        const category = card.getAttribute('data-category');
                        if (category === filterValue) {
                            card.classList.remove('hidden');
                        } else {
                            card.classList.add('hidden');
                        }
                    }
                });
            });
        });
    }

    // Multi-step Appointment Form
    function initializeAppointmentForm() {
        const steps = document.querySelectorAll('.step');
        const formSteps = document.querySelectorAll('.form-step');
        const nextButtons = document.querySelectorAll('[id$="Next"]');
        const backButtons = document.querySelectorAll('[id$="Back"]');
        
        let currentStep = 1;

        function showStep(stepNumber) {
            // Update step indicators
            steps.forEach((step, index) => {
                if (index + 1 <= stepNumber) {
                    step.classList.add('active');
                } else {
                    step.classList.remove('active');
                }
            });

            // Update form steps
            formSteps.forEach((step, index) => {
                if (index + 1 === stepNumber) {
                    step.classList.add('active');
                } else {
                    step.classList.remove('active');
                }
            });

            currentStep = stepNumber;
        }

        // Next button handlers
        document.getElementById('step1Next')?.addEventListener('click', function() {
            if (validateStep1()) {
                showStep(2);
            }
        });

        document.getElementById('step2Next')?.addEventListener('click', function() {
            if (validateStep2()) {
                populateAppointmentSummary();
                showStep(3);
            }
        });

        // Back button handlers
        document.getElementById('step2Back')?.addEventListener('click', function() {
            showStep(1);
        });

        document.getElementById('step3Back')?.addEventListener('click', function() {
            showStep(2);
        });

        // Form validation functions
        function validateStep1() {
            const requiredFields = ['firstName', 'lastName', 'phoneAppt', 'emailAppt', 'dateOfBirth'];
            let isValid = true;

            requiredFields.forEach(fieldName => {
                const field = document.getElementById(fieldName);
                if (field && !field.value.trim()) {
                    field.style.borderColor = '#ff4444';
                    isValid = false;
                } else if (field) {
                    field.style.borderColor = '';
                }
            });

            return isValid;
        }

        function validateStep2() {
            const requiredFields = ['preferredDateDetailed', 'preferredTimeDetailed', 'serviceNeededDetailed'];
            let isValid = true;

            requiredFields.forEach(fieldName => {
                const field = document.getElementById(fieldName);
                if (field && !field.value.trim()) {
                    field.style.borderColor = '#ff4444';
                    isValid = false;
                } else if (field) {
                    field.style.borderColor = '';
                }
            });

            const patientType = document.querySelector('input[name="patientType"]:checked');
            if (!patientType) {
                isValid = false;
                document.querySelectorAll('input[name="patientType"]').forEach(radio => {
                    radio.parentElement.style.color = '#ff4444';
                });
            }

            return isValid;
        }

        function populateAppointmentSummary() {
            const personalInfo = {
                'First Name': document.getElementById('firstName')?.value || '',
                'Last Name': document.getElementById('lastName')?.value || '',
                'Phone': document.getElementById('phoneAppt')?.value || '',
                'Email': document.getElementById('emailAppt')?.value || '',
                'Date of Birth': document.getElementById('dateOfBirth')?.value || ''
            };

            const appointmentInfo = {
                'Preferred Date': document.getElementById('preferredDateDetailed')?.value || '',
                'Preferred Time': document.getElementById('preferredTimeDetailed')?.value || '',
                'Service Needed': document.getElementById('serviceNeededDetailed')?.value || '',
                'Doctor Preference': document.getElementById('doctorPreference')?.value || 'No preference',
                'Insurance': document.getElementById('insuranceProvider')?.value || 'None provided',
                'Patient Type': document.querySelector('input[name="patientType"]:checked')?.value || ''
            };

            // Populate summary sections
            const personalSummary = document.getElementById('personalSummary');
            if (personalSummary) {
                personalSummary.innerHTML = Object.entries(personalInfo)
                    .filter(([key, value]) => value)
                    .map(([key, value]) => `<p><strong>${key}:</strong> ${value}</p>`)
                    .join('');
            }

            const appointmentSummary = document.getElementById('appointmentSummary');
            if (appointmentSummary) {
                appointmentSummary.innerHTML = Object.entries(appointmentInfo)
                    .filter(([key, value]) => value)
                    .map(([key, value]) => `<p><strong>${key}:</strong> ${value}</p>`)
                    .join('');
            }
        }

        // Handle form submission
        const appointmentForm = document.getElementById('appointmentFormDetailed');
        if (appointmentForm) {
            appointmentForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const submitButton = this.querySelector('button[type="submit"]');
                const originalText = submitButton.textContent;
                submitButton.textContent = 'Submitting...';
                submitButton.disabled = true;

                // Simulate form submission
                setTimeout(() => {
                    submitButton.textContent = originalText;
                    submitButton.disabled = false;
                    
                    showSuccessModal('Appointment Request Submitted!', 
                        'Thank you for choosing SmileCare Dental Clinic. We\'ve received your appointment request and will contact you within 24 hours to confirm your appointment.');
                    
                    // Reset form and return to step 1
                    appointmentForm.reset();
                    showStep(1);
                    
                    // Log form data (in real app, send to server)
                    console.log('Appointment form submitted');
                }, 1000);
            });
        }
    }

    // Contact Form Handler
    function initializeContactForm() {
        const contactForm = document.getElementById('contactForm');
        if (contactForm) {
            contactForm.addEventListener('submit', function(e) {
                e.preventDefault();

                const submitButton = this.querySelector('button[type="submit"]');
                const originalText = submitButton.textContent;
                submitButton.textContent = 'Sending...';
                submitButton.disabled = true;

                // Basic validation
                const requiredFields = ['contactName', 'contactPhone', 'contactEmail', 'contactMessage'];
                let isValid = true;

                requiredFields.forEach(fieldName => {
                    const field = this.querySelector(`[name="${fieldName}"]`);
                    if (!field.value.trim()) {
                        field.style.borderColor = '#ff4444';
                        isValid = false;
                    } else {
                        field.style.borderColor = '';
                    }
                });

                setTimeout(() => {
                    submitButton.textContent = originalText;
                    submitButton.disabled = false;

                    if (isValid) {
                        showSuccessModal('Message Sent!', 
                            'Thank you for contacting SmileCare Dental Clinic. We\'ve received your message and will get back to you within 24 hours.');
                        contactForm.reset();
                        console.log('Contact form submitted');
                    }
                }, 800);
            });
        }
    }

    // Review Form Handler
    const reviewForm = document.getElementById('reviewForm');
    if (reviewForm) {
        reviewForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const submitButton = this.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.textContent = 'Submitting...';
            submitButton.disabled = true;

            // Basic validation
            const requiredFields = ['reviewName', 'reviewService', 'reviewText'];
            const ratingField = this.querySelector('input[name="rating"]:checked');
            let isValid = true;

            requiredFields.forEach(fieldName => {
                const field = this.querySelector(`[name="${fieldName}"]`);
                if (!field.value.trim()) {
                    field.style.borderColor = '#ff4444';
                    isValid = false;
                } else {
                    field.style.borderColor = '';
                }
            });

            if (!ratingField) {
                isValid = false;
                const ratingContainer = this.querySelector('.rating-input');
                ratingContainer.style.borderColor = '#ff4444';
            }

            setTimeout(() => {
                submitButton.textContent = originalText;
                submitButton.disabled = false;

                if (isValid) {
                    showSuccessModal('Review Submitted!', 
                        'Thank you for your feedback! Your review has been submitted and will be published after moderation.');
                    reviewForm.reset();
                    console.log('Review form submitted');
                }
            }, 800);
        });
    }

    // Modal Functions
    function showSuccessModal(title, message) {
        const modal = document.getElementById('successModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalMessage = document.getElementById('modalMessage');
        
        if (modal && modalTitle && modalMessage) {
            modalTitle.textContent = title;
            modalMessage.textContent = message;
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    }

    window.closeModal = function() {
        const modal = document.getElementById('successModal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    };

    // Close modal when clicking outside
    const successModal = document.getElementById('successModal');
    if (successModal) {
        successModal.addEventListener('click', function(e) {
            if (e.target === successModal) {
                closeModal();
            }
        });
    }

    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && successModal && !successModal.classList.contains('hidden')) {
            closeModal();
        }
    });

    // Handle browser back/forward buttons
    window.addEventListener('popstate', function(e) {
        const page = e.state?.page || getPageFromHash();
        if (pages[page] || page === 'home') {
            showPage(page);
        }
    });

    function getPageFromHash() {
        const hash = window.location.hash.substring(1);
        return hash || 'home';
    }

    // Initialize on page load
    function initialize() {
        handleNavigation();
        
        // Show initial page based on URL hash
        const initialPage = getPageFromHash();
        showPage(initialPage);

        // Set minimum date for appointment booking (today)
        const dateInputs = document.querySelectorAll('input[type="date"]');
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;
        
        dateInputs.forEach(input => {
            if (input.name && input.name.toLowerCase().includes('date')) {
                input.min = todayStr;
            }
        });

        // Phone number formatting
        const phoneInputs = document.querySelectorAll('input[type="tel"]');
        phoneInputs.forEach(input => {
            input.addEventListener('blur', function() {
                this.value = formatPhoneNumber(this.value);
            });
        });

        // Form input enhancements
        const formInputs = document.querySelectorAll('.form-control');
        formInputs.forEach(input => {
            input.addEventListener('focus', function() {
                this.parentElement.classList.add('focused');
            });

            input.addEventListener('blur', function() {
                this.parentElement.classList.remove('focused');
                
                // Clear error styling when user starts typing
                if (this.style.borderColor === 'rgb(255, 68, 68)') {
                    this.style.borderColor = '';
                }
            });

            input.addEventListener('input', function() {
                if (this.style.borderColor === 'rgb(255, 68, 68)') {
                    this.style.borderColor = '';
                }
            });
        });

        // Header background change on scroll
        const header = document.querySelector('.header');
        function handleHeaderScroll() {
            if (window.scrollY > 50) {
                header.style.background = 'rgba(255, 255, 255, 0.95)';
                header.style.backdropFilter = 'blur(10px)';
            } else {
                header.style.background = '#ffffff';
                header.style.backdropFilter = 'none';
            }
        }

        window.addEventListener('scroll', debounce(handleHeaderScroll, 16));

        // Scroll animations
        initializeScrollAnimations();
        window.addEventListener('scroll', debounce(handleScrollAnimations, 16));
    }

    // Scroll Animations
    function initializeScrollAnimations() {
        const animatedElements = [
            '.service-preview-card',
            '.team-preview-card',
            '.testimonial-preview-card',
            '.service-category-detailed',
            '.team-member-detailed',
            '.testimonial-detailed-card',
            '.info-section',
            '.contact-card',
            '.info-card'
        ];

        animatedElements.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.classList.add('fade-in');
            });
        });

        handleScrollAnimations();
    }

    function handleScrollAnimations() {
        const elements = document.querySelectorAll('.fade-in');
        
        elements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const elementVisible = 150;
            
            if (elementTop < window.innerHeight - elementVisible) {
                element.classList.add('visible');
            }
        });
    }

    // Utility Functions
    function formatPhoneNumber(phone) {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 10) {
            return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
        }
        return phone;
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Email validation
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Phone validation
    function isValidPhone(phone) {
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
    }

    // Click-to-call functionality enhancement
    const phoneLinks = document.querySelectorAll('a[href^="tel:"]');
    phoneLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });
    });

    // Enhanced form validation for all forms
    function validateForm(form, requiredFields) {
        let isValid = true;
        const errors = [];

        requiredFields.forEach(fieldName => {
            const field = form.querySelector(`[name="${fieldName}"]`);
            if (field) {
                const value = field.value.trim();
                
                if (!value) {
                    field.style.borderColor = '#ff4444';
                    isValid = false;
                    errors.push(`${fieldName} is required`);
                } else {
                    field.style.borderColor = '';
                    
                    // Specific validation based on field type
                    if (fieldName.toLowerCase().includes('email') && !isValidEmail(value)) {
                        field.style.borderColor = '#ff4444';
                        isValid = false;
                        errors.push('Please enter a valid email address');
                    }
                    
                    if (fieldName.toLowerCase().includes('phone') && !isValidPhone(value)) {
                        field.style.borderColor = '#ff4444';
                        isValid = false;
                        errors.push('Please enter a valid phone number');
                    }
                    
                    if (fieldName.toLowerCase().includes('date')) {
                        const selectedDate = new Date(value);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        if (selectedDate < today) {
                            field.style.borderColor = '#ff4444';
                            isValid = false;
                            errors.push('Please select a future date');
                        }
                    }
                }
            }
        });

        return { isValid, errors };
    }

    // Add loading states to buttons
    function setButtonLoading(button, isLoading) {
        if (isLoading) {
            button.dataset.originalText = button.textContent;
            button.textContent = 'Loading...';
            button.disabled = true;
            button.style.opacity = '0.7';
        } else {
            button.textContent = button.dataset.originalText || button.textContent;
            button.disabled = false;
            button.style.opacity = '';
        }
    }

    // SEO-friendly navigation updates
    function updatePageMeta(pageId) {
        if (pages[pageId]) {
            // Update title
            document.title = pages[pageId].title;
            
            // Update meta description
            const metaDescription = document.querySelector('meta[name="description"]');
            if (metaDescription) {
                metaDescription.setAttribute('content', pages[pageId].description);
            }
            
            // Update canonical URL (if needed)
            const canonical = document.querySelector('link[rel="canonical"]');
            if (canonical) {
                canonical.href = window.location.origin + window.location.pathname + '#' + pageId;
            }
        }
    }

    // Initialize everything
    initialize();
    
    console.log('SmileCare Dental Clinic multi-page website initialized successfully!');
});

// Global utility functions that might be called from HTML
window.formatPhoneDisplay = function(phoneNumber) {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phoneNumber;
};

window.validateEmailInput = function(input) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (input.value && !emailRegex.test(input.value)) {
        input.setCustomValidity('Please enter a valid email address');
    } else {
        input.setCustomValidity('');
    }
};

// Analytics tracking (placeholder for real implementation)
window.trackPageView = function(pageName) {
    console.log(`Page view tracked: ${pageName}`);
    // In a real implementation, you would send this to your analytics service
    // gtag('config', 'GA_MEASUREMENT_ID', { page_title: pageName });
};

window.trackFormSubmission = function(formName) {
    console.log(`Form submission tracked: ${formName}`);
    // In a real implementation, you would send this to your analytics service
    // gtag('event', 'form_submit', { form_name: formName });
};