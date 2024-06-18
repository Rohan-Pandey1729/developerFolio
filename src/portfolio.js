/* Change this file to get your personal Portfolio */

// To change portfolio colors globally go to the  _globalColor.scss file

import emoji from "react-easy-emoji";
import splashAnimation from "./assets/lottie/splashAnimation"; // Rename to your file name for custom animation

// Splash Screen

const splashScreen = {
  enabled: true, // set false to disable splash screen
  animation: splashAnimation,
  duration: 2000 // Set animation duration as per your animation
};

// Summary And Greeting Section

const illustration = {
  animated: true // Set to false to use static SVG
};

const greeting = {
  username: "Rohan Pandey",
  title: "Hey there! I'm Rohan",
  subTitle: emoji(
    "An aspiring ML Engineer with extensive experience in Python, Java, C++, and SQL. Proven track record in developing machine learning models, designing autonomous rocketry systems, and managing databases on the Azure Cloud Platform."
  ),
  resumeLink:
    "https://drive.google.com/file/d/1FcBV0H86bGiC5fro0qDyV7O1_g_azQ8X/view?usp=drive_link", // Set to empty to hide the button
  displayGreeting: true // Set false to hide this section, defaults to true
};

// Social Media Links

const socialMediaLinks = {
  github: "https://github.com/Rohan-Pandey1729",
  linkedin: "https://www.linkedin.com/in/rohanpandeymath/",
  gmail: "rpande@uw.edu",
  // Instagram, Twitter and Kaggle are also supported in the links!
  // To customize icons and social links, tweak src/components/SocialMedia
  display: true // Set true to display this section, defaults to false
};

// Skills Section

const skillsSection = {
  title: "What I do",
  subTitle: "ASPIRING MACHINE LEARNING ENGINEER WITH A PASSION FOR ROCKETRY AND CANCER RESEARCH",
  skills: [
    emoji(
      "⚡ Develop LLMs, CNNs, and RNNs in Python using TensorFlow, Keras, and PyTorch"
    ),
    emoji("⚡ Design autonomous rocketry systems using C++ and Arduino and ROS"),
    emoji(
      "⚡ Build innovative mathematical models for cancer research using MATLAB and Python"
    )
  ],

  /* Make Sure to include correct Font Awesome Classname to view your icon
https://fontawesome.com/icons?d=gallery */

  softwareSkills: [
    {
      skillName: "sql-database",
      fontAwesomeClassname: "fas fa-database"
    },
    {
      skillName: "java",
      fontAwesomeClassname: "fab fa-java"
    },
    {
      skillName: "python",
      fontAwesomeClassname: "fab fa-python"
    }
  ],
  display: true // Set false to hide this section, defaults to true
};

// Education Section

const educationInfo = {
  display: true, // Set false to hide this section, defaults to true
  schools: [
    {
      schoolName: "University of Washington",
      logo: require("./Washington_Huskies_logo.png"),
      subHeader: "Bachelor of Science in Applied and Computational Mathematical Sciences",
      duration: "September 2022 - December 2025",
      desc: "NASA Space Grant Scholar | Dean's List | Minor in Applied Mathematics",
      descBullets: ["Coursework: Database Systems, Machine Learning, Data Structures and Algorithms, Linear Algebra, Differential Equations, and Numerical Analysis"]
    }
  ]
};

// Your top 3 proficient stacks/tech experience

const techStack = {
  viewSkillBars: true, //Set it to true to show Proficiency Section
  experience: [
    {
      Stack: "Python", //Insert stack or technology you have experience in
      progressPercentage: "90%" //Insert relative proficiency in percentage
    },
    {
      Stack: "ML Algorithms",
      progressPercentage: "70%"
    },
    {
      Stack: "Data Engineering",
      progressPercentage: "60%"
    },
    {
      Stack: "ML OPS",
      progressPercentage: "40%"
    }
  ],
  displayCodersrank: false // Set true to display codersrank badges section need to changes your username in src/containers/skillProgress/skillProgress.js:17:62, defaults to false
};

// Work experience section

const workExperiences = {
  display: true, //Set it to true to show workExperiences Section
  experience: [
    {
      role: "Project Manager",
      company: "National Aeronautics and Space Administration - NASA",
      companylogo: require("./NASA_logo.svg.png"),
      date: "May 2024 – Present",
      desc: "Led a low-cost robotic surface reconnaissance project to map near-surface water ice in the lunar South Pole’s Permanently Shadowed Regions, ensuring task completion and document consistency to support future moon landings",
      descBullets: [
        "Experience in CAD software",
        "Logistical knowledge and experience in building a NASA approved mission"
      ]
    },
    {
      role: "Research Intern",
      company: "University of Washington - Department of Applied Mathematics",
      companylogo: require("./Washington_Huskies_logo.png"),
      date: "April 2023 - Present",
      desc: "Conducted research with Dr. Konstantinos Mamis on combinatorics and moments of normal distribution, analyzing extensions of Stein’s Lemma and performing matrix manipulations. Investigated the theory of Gaussian processes with applications in stochastic dynamical systems for epidemiology and cancer modeling, contributing to the development of new mathematical models"
    },
    {
      role: "Lead Engineer",
      company: "Society of Advanced Rocket Propulsion - SARP",
      companylogo: require("./Washington_Huskies_logo.png"),
      date: "September 2022 - June 2024",
      desc: "Led a team to build a recovery system that guides the rocket back to a GPS location. Analyzed the flight path using C++ and Python, and designed a load cell algorithm with Arduino. Developed a data transmission system to model the rocket flight path and plot its GPS location",
      descBullets: [
        "Experience in Embedded Systems",
        "Extensive use of C++, Python, and Arduino",
        "Experience building PCBs and 3D model design"
      ]
    }
  ]
};

/* Your Open Source Section to View Your Github Pinned Projects
To know how to get github key look at readme.md */

const openSource = {
  showGithubProfile: "true", // Set true or false to show Contact profile using Github, defaults to true
  display: true // Set false to hide this section, defaults to true
};

// Some big projects you have worked on

const bigProjects = {
  title: "Big Projects",
  subtitle: "SOME OF MY BIG PROJECTS",
  projects: [
    {
      image: require("./Research Rover.png"),
      projectName: "Research Rover",
      projectDesc: "Research Rover is a cutting-edge website that aids users in their research pursuits. It offers tailored research topics, paper links, and concise model and statistic summaries. This resource is especially valuable for students and researchers seeking guidance in exploring specific areas of interest. The model was built using LLMs and Crew AI to have AI Agents that can answer questions and provide summaries of research papers",
      footerLink: [
        {
          name: "Visit Website",
          url: "https://devpost.com/software/research-rover-jn389d"
        }
        //  you can add extra buttons here.
      ]
    },
    {
      image: require("./OpenBCI_Logo.png"),
      projectName: "MindTunes",
      projectDesc: "Our product aims to provide a solution for each unique user to remain concentrated by taking a short test, and determining what genre of music is optimal for the user to stay concentrated. We used OpenBCI's Cap kit, to help create a product that can help users stay concentrated and focused on their work. More information can be found on our Github page. This project won third place at the NeuroAI Hackathon at UW in 2024",
      footerLink: [
        {
          name: "Visit Website",
          url: "https://github.com/Rohan-Pandey1729/Neuro-Hackathon-2024"
        }
      ]
    }
  ],
  display: true // Set false to hide this section, defaults to true
};

// Achievement Section
// Include certificates, talks etc

const achievementSection = {
  title: emoji("Achievements And Certifications 🏆 "),
  subtitle:
    "Achievements, Certifications, Award Letters and Some Cool Stuff that I have done !",

  achievementsCards: [
    {
    },
    {
      
    },

    {
     
    }
  ],
  display: false // Set false to hide this section, defaults to true
};

// Blogs Section

const blogSection = {
  title: "Blogs",
  subtitle:
    "With Love for Developing cool stuff, I love to write and teach others what I have learnt.",
  displayMediumBlogs: "true", // Set true to display fetched medium blogs instead of hardcoded ones
  blogs: [
    {}
  ],
  display: false // Set false to hide this section, defaults to true
};

// Talks Sections

const talkSection = {
  title: "TALKS",
  subtitle: emoji(
    "I LOVE TO SHARE MY LIMITED KNOWLEDGE AND GET A SPEAKER BADGE 😅"
  ),

  talks: [
    {
    }
  ],
  display: false // Set false to hide this section, defaults to true
};

// Podcast Section

const podcastSection = {
  title: emoji("Podcast 🎙️"),
  subtitle: "I LOVE TO TALK ABOUT MYSELF AND TECHNOLOGY",

  // Please Provide with Your Podcast embeded Link
  podcast: [
  ],
  display: false // Set false to hide this section, defaults to true
};

// Resume Section
const resumeSection = {
  title: "Resume",
  subtitle: "Feel free to download my resume",

  // Please Provide with Your Podcast embeded Link
  display: true // Set false to hide this section, defaults to true
};

const contactInfo = {
  title: emoji("Contact Me ☎️"),
  subtitle:
    "Discuss a project or just want to say hi?",
  number: "+1 425-428-2971",
  email_address: "rpande@uw.edu"
};

// Twitter Section

const twitterDetails = {
  userName: "", //Replace "twitter" with your twitter username without @
  display: false // Set true to display this section, defaults to false
};

const isHireable = true; // Set false if you are not looking for a job. Also isHireable will be display as Open for opportunities: Yes/No in the GitHub footer

export {
  illustration,
  greeting,
  socialMediaLinks,
  splashScreen,
  skillsSection,
  educationInfo,
  techStack,
  workExperiences,
  openSource,
  bigProjects,
  achievementSection,
  blogSection,
  talkSection,
  podcastSection,
  contactInfo,
  twitterDetails,
  isHireable,
  resumeSection
};
