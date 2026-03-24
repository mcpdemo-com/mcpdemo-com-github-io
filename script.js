// ===== MOBILE MENU TOGGLE =====
        // Function: toggleMobileMenu()
        // Purpose: Show/hide navigation menu on mobile devices
        // Triggers: Click on hamburger menu button
        document.addEventListener('DOMContentLoaded', function() {
            const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
            const mobileMenu = document.getElementById('mobile-menu');

            if (mobileMenuToggle && mobileMenu) {
                mobileMenuToggle.addEventListener('click', function() {
                    mobileMenu.classList.toggle('hidden');
                });

                // Close menu when clicking outside
                document.addEventListener('click', function(event) {
                    if (!mobileMenu.contains(event.target) && !mobileMenuToggle.contains(event.target)) {
                        mobileMenu.classList.add('hidden');
                    }
                });
            }

            // ===== NEWSLETTER FORM HANDLING =====
            // Function: handleNewsletterSubmit()
            // Purpose: Process newsletter subscription with URL parameters
            // Note: Uses a thank you page URL with contact data parameters
            const newsletterForm = document.getElementById('newsletter-form');
            if (newsletterForm) {
                newsletterForm.addEventListener('submit', function(e) {
                    e.preventDefault();
                    const formData = new FormData(newsletterForm);
                    const email = formData.get('email');

                    // Build URL parameters for contact attribution
                    const params = new URLSearchParams({
                        email: email,
                        full_name: '', // Could be added with a name field
                        agent: '48257001', // REQUIRED Widget ID for contact creation
                        tags: 'newsletter-subscriber,mcp-demo',
                        source: 'mcpdemo-homepage'
                    });

                    // In a real implementation, you would submit to a server
                    // For demo purposes, we'll log and show a success message
                    console.log('Newsletter subscription:', { email });
                    alert('Thank you for subscribing to MCP updates!');
                    newsletterForm.reset();

                    // Example redirect with parameters (commented out for demo):
                    // window.location.href = `/thank-you.html?${params.toString()}`;
                });
            }

            // ===== SMOOTH SCROLL FOR ANCHOR LINKS =====
            // Function: handleAnchorClicks()
            // Purpose: Smooth scrolling to section when clicking nav links
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', function(e) {
                    const href = this.getAttribute('href');
                    if (href === '#') return;

                    e.preventDefault();
                    const targetElement = document.querySelector(href);
                    if (targetElement) {
                        targetElement.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });

                        // Close mobile menu if open
                        if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
                            mobileMenu.classList.add('hidden');
                        }
                    }
                });
            });
        });