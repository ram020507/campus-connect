
Campus Connect

 A College-Centric Learning, Doubt Support, Campus Community & Career Platform

📌 Overview

**Campus Connect** is a centralized digital platform designed for college students and college management.

The platform brings academic learning resources, doubt support, campus activities, and career-related information into one connected college ecosystem.

The main goal is to help students continue learning even when they miss classes due to internships, hackathons, events, sports, medical leave, placements, or other activities.

---

🎯 Problem Statement

College students commonly face several problems:

* Missing important lectures due to internships, hackathons, events, sports, or other activities.
* Difficulty finding the correct lecture videos and study materials.
* Difficulty getting quick support when they have doubts.
* Repeated doubts consume teacher time.
* Students may not know about other students' achievements, projects, workshops, and events.
* Students may not have clear information about companies, job roles, and required skills for placements.
* Academic learning, campus activities, and career information are often available through separate systems.

Campus Connect aims to bring these activities together into a single college-focused platform.

---

💡 Solution

Campus Connect provides:

* Learning Resources
* AI-based Doubt Support
* Learning Feed
* Campus Hub
* Campus Job information

The platform is designed around the idea of a **college organizational learning ecosystem**, where learning interactions can become reusable knowledge and students can also connect with campus activities and career opportunities.

---

🏗️ Platform Structure

Campus Connect contains three major user types:

```text
Campus Connect
│
├── Admin
│   ├── Content Management
│   ├── Account Management
│   ├── Campus Hub
│   └── Campus Jobs
│
├── Student
│   ├── Learning Resources
│   ├── Ask a Doubt
│   ├── Learning Feed
│   ├── Campus Hub
│   └── Campus Job
│
└── Teacher
    └── Campus Hub
```

---

👨‍💼 Admin Panel

The Admin manages the college platform.

## Content Management

Admin can manage:

* Lecture Videos
* Notes
* PDFs
* Other learning resources

Content can be organized based on:

* College
* Year
* Department
* Subject

 Account Management

Admin can manage:

 Student Accounts

* Create
* Edit
* Delete
* View student accounts

 Teacher Accounts

* Create
* Edit
* Delete
* Assign subjects
* View teacher accounts

## Campus Hub

Admin can create official college posts such as:

* College Events
* Workshops
* Competitions
* Announcements
* Official Updates

 Campus Jobs

Admin can publish college placement and job information including:

* Company
* Job Role
* Eligibility
* Required Skills

---

 🎓 Student Panel

 1. Learning Resources

Students can access:

 Lecture Videos

* Select semester
* Select subject
* Watch lecture videos
* Access subject notes
* Search videos by title

 Important Topics / Notes

Students can access:

* Important revision videos
* Notes
* PDFs
* PPT files

---

# 2. Ask a Doubt

The latest system design uses an **AI-first doubt-solving approach**.

Students can submit:

 Text Doubt

Students enter their question using text.

 Text + Image Doubt

Students can provide text and images when the question requires visual understanding.

---

AI Doubt Processing

The planned/current AI architecture uses:

```text
Student Doubt
      ↓
Gemini Multimodal Capability
      ↓
Gemini Embedding 2
      ↓
Hybrid Matching
      ↓
Match Found?
   ┌───┴────┐
  YES       NO
   ↓         ↓
Previous     RAG
Doubt +      ↓
Answer   College Resources
             ↓
       Gemini 2.5 Flash
             ↓
         AI Answer
             ↓
       Learning Feed
```

AI Technologies

* **Gemini 2.5 Flash** – Generates answers for student doubts.
* **Gemini Multimodal Capability** – Understands image-based questions, diagrams, and handwritten problems.
* **Gemini Embedding 2** – Converts doubts into vectors for similarity matching.
* **Hybrid Matching** – Combines keyword matching and vector similarity.
* **RAG** – Retrieves relevant college learning resources to support AI-generated answers.

---

 3. Learning Feed

The Learning Feed stores completed and verified learning discussions.

Students can:

* View solved doubts
* Learn from previous solutions
* Scroll through learning content
* Reuse previously solved knowledge

The purpose is to transform individual doubt-solving interactions into reusable learning resources.

---

 4. Campus Hub

Campus Hub is a professional college-community timeline.

Students can post:

* Projects
* Internships
* Hackathons
* Certifications
* Workshops
* Symposiums
* Competitions
* Academic achievements

Students can also view relevant:

* Student achievements
* Teacher posts
* College events
* Professional updates

Campus Hub Categories

```text
[ My Posts ] [ All ] [ Student ] [ College ]
```

Users can:

* Like
* Comment
* Reply
* Save

Posts follow college-based visibility rules.

---

 5. Campus Job

Campus Job connects students with college placement information.

Students can view:

* Companies visiting the college
* Job roles
* Eligibility
* Required skills

The feature helps students understand:

```text
Company
   ↓
Job Role
   ↓
Required Skills
   ↓
Learn Required Skills
   ↓
Prepare for Placement
```

 Current Prototype Status

**Campus Job is part of the current Campus Connect concept but is not implemented in the uploaded prototype version.**

---

# 👨‍🏫 Teacher Panel

In the current Campus Connect architecture, teachers mainly participate through **Campus Hub**.

Teachers can:

* Post achievements
* Share job information
* Share professional updates
* View student achievements
* View college events

---

 🧠 Current Prototype vs. Updated Concept

The available working prototype represents an **earlier version of Campus Connect**.

 Earlier Prototype

The prototype demonstrates the initial:

* Learning Resource system
* Student interface
* Admin interface
* Teacher-based doubt-solving workflow
* Basic Campus Connect functionality

 Updated Concept

The project has since been refined toward:

* AI-based doubt solving
* Gemini Multimodal capability
* Gemini Embedding 2
* Hybrid duplicate matching
* RAG-based college resource retrieval
* Learning Feed
* Campus Hub
* Campus Job

 Important

The deployed prototype should **not be considered a complete implementation of the latest architecture**.

The prototype is provided to demonstrate the earlier working implementation and project evolution.

---

 🛠️ Technologies Used

 Software Technologies

* **TypeScript** – Main programming language for reliable application development.
* **React** – Builds interactive Student, Teacher, and Admin interfaces.
* **Tailwind CSS** – Creates a responsive and modern UI.
* **Vite** – Provides fast development and application builds.
* **SQL** – Stores and retrieves structured project data.
* **Supabase** – Provides database, authentication, storage, and real-time updates.

 AI Technologies

* **Gemini 2.5 Flash**
* **Gemini Multimodal Capability**
* **Gemini Embedding 2**
* **Hybrid Matching**
* **Retrieval-Augmented Generation (RAG)**

---

 🗄️ Backend & Database

Campus Connect uses **Supabase** for:

* Database
* Authentication
* Storage
* Real-time updates

The platform organizes information such as:

* Students
* Teachers
* Colleges
* Departments
* Subjects
* Learning resources
* Doubts
* Answers
* Campus posts
* Job information

---

# 🔗 Project Links

## 🌐 Live Prototype

https://campus-connect-ram020507.vercel.app/

## 💻 GitHub Repository

https://github.com/ram020507/campus-connect

---

 🚀 Prototype Access

The prototype is currently deployed using **Vercel**.

The live prototype demonstrates the earlier working version of Campus Connect.

For the latest AI-based architecture and additional modules, refer to the project description and updated system design.

---

 🌱 Future Development

Planned improvements include:

* Complete AI-based doubt-solving implementation
* Advanced hybrid doubt matching
* Improved RAG using college-specific resources
* Campus Job implementation
* More advanced Campus Hub features
* Mobile application
* Advanced analytics
* College ERP integration
* Notification system
* Additional AI learning features

---

 🎯 Project Goal

Campus Connect aims to create a connected college ecosystem where:

**Missed Class → Learning Resources**

**Student Doubt → AI Support**

**Solved Doubt → Reusable Knowledge**

**Learning Feed → Continuous Learning**

**Campus Activities → Student Participation**

**Job Information → Career Preparation**

Ultimately, Campus Connect aims to connect **learning, knowledge sharing, campus participation, and career preparation** within a single college ecosystem.

---

👥 Project

**Campus Connect**

**Category:** Smart Education / College Learning Ecosystem

**Prototype:** Available through the live Vercel deployment and GitHub repository.
