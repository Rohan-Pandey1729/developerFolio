# Rohan Pandey - Personal Portfolio Website

**Live at:** [https://rohan-pandey1729.github.io/developerFolio/](https://rohan-pandey1729.github.io/developerFolio/)

A beautiful, modern, and responsive personal portfolio website showcasing my work as a Research Scientist and Machine Learning Engineer.

## 🌟 Features

### Visual Design
- **3D Interactive Hero**: Central 3D cube (Three.js) — rotate with mouse/touch and **click a face** to jump to that section (About, Experience, Projects, Hackathons, Publications, Contact).
- **Modern Gradient Design**: Pink–magenta gradient theme with glassmorphism.
- **Custom Cursor**: Interactive custom cursor with hover effects.
- **Contact Form**: Visitors can send you a message directly on the site; messages go to your email via [Formspree](https://formspree.io).

### Sections
1. **Hero**: 3D cube + name and “Click a face to explore”.
2. **About**: Personal background and skills.
3. **Experience**: Timeline-based experience.
4. **Projects**: Research and hackathon projects.
5. **Publications**: Papers and preprints.
6. **Contact**: Email, LinkedIn, GitHub, Resume + **contact form** (Formspree).

### Technical Features
- **Responsive Design**: Fully responsive across all devices
- **Mobile Navigation**: Hamburger menu for mobile devices
- **Smooth Scrolling**: Smooth navigation between sections
- **Intersection Observer**: Performance-optimized scroll animations
- **Typing Effect**: Animated text typing in hero section
- **Parallax Effects**: Subtle parallax scrolling effects

## 🚀 Technologies Used

- **HTML5**: Semantic markup
- **CSS3**: Modern styling with gradients, animations, and responsive design
- **JavaScript (ES6+)**: Interactive features, form handling, smooth scroll.
- **Three.js**: 3D cube with OrbitControls and raycasting for face clicks.
- **Formspree**: Contact form submissions to your email (no backend needed).
- **Font Awesome** & **Google Fonts (Inter)**.

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
├── styles.css          # CSS (hero overlay, 3D container, contact form)
├── script.js           # Nav, smooth scroll, form submit handler
├── three-scene.js      # Three.js 3D cube + raycasting
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