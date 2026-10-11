
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
* Students may not know about other student's achievements, projects, workshops, and events.
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
* Selected Students Detail

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
* selected students
  

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

🛠️ Technology Stack

TypeScript – Main programming language

React – Interactive user interfaces

Tailwind CSS – Responsive and modern UI

Vite – Development and build tool

SQL – Structured data management

Supabase – Database, authentication, storage, and real-time updates


Live Website

https://campus-connect-ram020507.vercel.app/

Demo Login Credentials

1,Admin Login
Username: ram   Password: ram020507

2,Student Login
Username: 241 Password: 02-05-2007

3,Teacher Login
Username: 123 Password: 02-05-2007

Planned Implementations
Current Status: Prototype includes teacher-based doubt solving, a college-level Campus Hub, and Campus Jobs. AI-based doubt solving and a multi-college Campus Hub are planned for the next phase.

1. AI-Based Doubt Solving


Planned Technologies: 
• Gemini 2.5 Flash – AI answer generation
• Gemini Multimodal (VLM) – Understanding image-based questions and diagrams
• Gemini Embedding 2 – Vector embeddings for similarity matching
• Hybrid Matching – Keyword and vector-based matching
• Retrieval-Augmented Generation (RAG) – Retrieving relevant college learning resources

Workflow:  

Student submits a doubt → AI understands the question → Hybrid Matching checks previously solved doubts.

If a match is found: Display the relevant previous question and answer.

If no match is found: Retrieve relevant college learning resources using RAG and generate an answer using Gemini 2.5 Flash.

2. Campus Hub – Multi-College Community

Current Status: Extension into a multi-college community is planned.

Purpose: Allow students, teachers, and colleges to share achievements, projects, extracurricular activities, and opportunities across institutions.

Features:

My College: View posts and activities from the user’s own college.

Other Colleges: Discover posts and activities from other colleges registered on Campus Connect.

Expected Outcome: Students will discover activities within their own college and explore opportunities and achievements across other colleges.


 
