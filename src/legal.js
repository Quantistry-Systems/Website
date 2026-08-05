import './style.css';

// contact form modal logic
const contactOverlay = document.getElementById('contact-modal-overlay');
const contactCloseBtn = document.getElementById('contact-modal-close');
const contactForm = document.getElementById('contact-form');
const submitBtn = contactForm?.querySelector('button[type="submit"]');
const formResult = document.getElementById('form-result');

function openContactModal() {
    if (!contactOverlay) return;
    contactOverlay.classList.remove('hidden');
    contactOverlay.classList.add('flex');
    document.body.style.overflow = 'hidden';
}

function closeContactModal() {
    if (!contactOverlay) return;
    contactOverlay.classList.add('hidden');
    contactOverlay.classList.remove('flex');
    document.body.style.overflow = '';
}

if (contactCloseBtn) {
    contactCloseBtn.addEventListener('click', closeContactModal);
}

if (contactOverlay) {
    contactOverlay.addEventListener('click', (e) => {
        if (e.target === contactOverlay) closeContactModal();
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && contactOverlay && !contactOverlay.classList.contains('hidden')) {
        closeContactModal();
    }
});

document.querySelectorAll('a[href="#contact"]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        openContactModal();
    });
});

if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(contactForm);
        formData.append("access_key", "b887cce8-fa73-4ac7-84b2-bbcf66d9ccc6");

        const originalText = submitBtn.textContent;
        submitBtn.textContent = "Sending...";
        submitBtn.disabled = true;

        formResult.className = 'font-mono text-xs mt-1 hidden';

        try {
            const response = await fetch("https://api.web3forms.com/submit", {
                method: "POST",
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                formResult.textContent = "Success! Your message has been sent.";
                formResult.classList.add('text-okgreen');
                formResult.classList.remove('hidden');
                contactForm.reset();

                setTimeout(() => {
                    closeContactModal();
                    formResult.classList.add('hidden');
                }, 3000);
            } else {
                formResult.textContent = "Error: " + data.message;
                formResult.classList.add('text-badred');
                formResult.classList.remove('hidden');
            }
        } catch (error) {
            formResult.textContent = "Something went wrong. Please try again.";
            formResult.classList.add('text-badred');
            formResult.classList.remove('hidden');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}