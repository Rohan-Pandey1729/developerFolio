# Rohan Pandey - Personal Portfolio Website

**Live at:** [https://rohan-pandey1729.github.io/developerFolio/](https://rohan-pandey1729.github.io/developerFolio/)

A beautiful, modern, and responsive personal portfolio website showcasing my work as a Research Scientist and Machine Learning Engineer.

## 🌟 Features

### Visual Design
- **Rocket loader**: Blast-off loading screen with a smooth fade-in.
- **Modern dark theme**: Warm navy + amber palette with subtle glass effects.
- **Custom Cursor**: Interactive custom cursor with hover effects.
- **Subtle background flair**: Lightweight animated starfield canvas in the hero.
- **Contact Form**: Visitors can send you a message directly on the site; messages go to your email via [Formspree](https://formspree.io).
- **Spotlight modal**: Click hackathon cards to open quick details + links.
- **Case studies**: Dedicated pages under `case-studies/` for deeper writeups.

### Sections
1. **Hero**
2. **Now** (status widget)
3. **About**
4. **Experience** (expandable timeline)
5. **Hackathons** (case studies + spotlight)
6. **Publications** (links out)
7. **Contact** (links + Formspree)

### Technical Features
- **Responsive Design**: Fully responsive across all devices
- **Mobile Navigation**: Hamburger menu for mobile devices
- **Smooth Scrolling**: Smooth navigation between sections
- **Intersection Observer**: Performance-optimized scroll animations
- **Scroll progress bar**: Top progress indicator

## 🚀 Technologies Used

- **HTML5**: Semantic markup
- **CSS3**: Modern styling with gradients, animations, and responsive design
- **JavaScript (ES6+)**: Interactive features, form handling, smooth scroll.
- **Formspree**: Contact form submissions to your email (no backend needed).
- **Font Awesome** & **Google Fonts**.

## 📱 Responsive Design

The website is fully responsive and optimized for:
- Desktop (1200px+)
- Tablet (768px - 1199px)
- Mobile (320px - 767px)

## 🎨 Design Elements

### Color Scheme
- Primary Gradient: `#667eea` to `#764ba2`
- White: `#ffffff`
- Dark Gray: `#333333`
- Light Gray: `#f8f9fa`

### Typography
- Font Family: Inter (Google Fonts)
- Weights: 300, 400, 500, 600, 700

### Animations
- Floating animation for hero cards
- Scroll-triggered reveal animations
- Hover effects on interactive elements
- Smooth transitions throughout

## 📂 File Structure

```
developerFolio/
├── index.html          # Main HTML + contact form (Formspree action)
├── styles.css          # Styling (theme, modal, timeline, etc.)
├── script.js           # UI interactions (loader, flair, modal, form, etc.)
├── case-studies/       # Mini case-study pages
├── resume.pdf          # Resume file
└── README.md           # This file
```

## 📧 Contact form (Formspree)

Messages from the contact form are sent to **rpande.1729@gmail.com**. To enable this:

1. Go to [formspree.io](https://formspree.io) and sign up (free).
2. Create a new form and set the email to **rpande.1729@gmail.com**.
3. Copy your form ID (e.g. `mnqwezkl`).
4. In `index.html`, find the form and replace `YOUR_FORM_ID` in the `action` URL:
   `action="https://formspree.io/f/YOUR_FORM_ID"` → `action="https://formspree.io/f/mnqwezkl"` (your ID).

## 📈 Analytics (optional)

If you want privacy-friendly analytics, these are the easiest drop-in options.

### Option A: Plausible

Add this to `index.html` in `<head>` (replace `data-domain` with your value):

```html
<script defer data-domain="rohan-pandey1729.github.io" src="https://plausible.io/js/script.js"></script>
```

### Option B: Umami

Add this to `index.html` in `<head>`:

```html
<script defer src="https://cloud.umami.is/script.js" data-website-id="YOUR_UMAMI_WEBSITE_ID"></script>
```

## 🔧 Customization

### Colors
To change the color scheme, modify the CSS variables in `styles.css`:
```css
/* Main gradient */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### Content
Update the content in `index.html`:
- Personal information in the hero section
- About section content
- Experience timeline items
- Project cards
- Contact information

### Animations
Adjust animation timing and effects in `script.js`:
- Scroll animation delays
- Typing effect speed
- Parallax effect intensity

## 🌐 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 📞 Contact

- **Email**: rpande.1729@gmail.com
- **LinkedIn**: [Rohan Pandey](https://www.linkedin.com/in/rohanpandeymath/)
- **GitHub**: [Rohan-Pandey1729](https://github.com/Rohan-Pandey1729/)

---

Built with ❤️ and modern web technologies