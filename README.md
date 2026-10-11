Campus Connect 🎓
A College-Centric Learning, Campus Community & Career Platform
📌 Overview

Campus Connect is a centralized digital platform that connects college learning resources, doubt support, campus activities, and career information in one ecosystem.

It helps students access learning materials when they miss classes, find support for academic doubts, discover campus activities, and prepare for placement opportunities.

🎯 Problem Statement

College students often face challenges such as:

Missing lectures due to internships, events, hackathons, sports, or other activities.
Difficulty finding relevant lecture videos and study materials.
Delays in getting academic doubts resolved.
Limited awareness of student achievements and college activities.
Difficulty finding placement information, job roles, eligibility criteria, and required skills.
Academic learning, campus activities, and career information being spread across different platforms.
💡 Solution

Campus Connect brings these needs together through five main modules:

Learning Resources – Lecture videos, subject notes, PDFs, PPTs, and revision materials.
Ask a Doubt – Academic doubt submission and resolution.
Learning Feed – Reusable knowledge from completed and verified doubts.
Campus Hub – A professional timeline for student achievements, teacher updates, and college events.
Campus Jobs – College placement information, company details, job roles, eligibility, and required skills.
🏗️ Platform Structure
Campus Connect
│
├── Admin Panel
│   ├── Content Management
│   ├── Account Management
│   ├── Campus Hub
│   └── Campus Jobs
│
├── Student Panel
│   ├── Learning Resources
│   ├── Ask a Doubt
│   ├── Learning Feed
│   ├── Campus Hub
│   └── Campus Jobs
│
└── Teacher Panel
    └── Campus Hub
👨‍💼 Admin Panel

Administrators can:

Manage lecture videos, notes, PDFs, and other learning resources.
Organize content by college, year, department, and subject.
Create, edit, delete, and view student and teacher accounts.
Assign subjects to teachers.
Publish official college announcements, workshops, competitions, and events.
Manage company and placement information.

🎓 Student Panel
1. Learning Resources
Browse lecture videos by semester and subject.
Access subject notes and important revision materials.
View PDFs and PPT files.
Search lecture videos by title.
2. Ask a Doubt

Students can submit doubts using:

Text
Text with images

The current prototype uses teacher-based doubt solving. AI-based doubt solving is planned for a future development phase.

3. Learning Feed
View completed and verified doubt solutions.
Learn from previously solved questions.
Reuse existing knowledge for revision.
4. Campus Hub

A professional college-community timeline where students can share:

Projects and internships
Hackathons and competitions
Certifications and workshops
Symposiums and academic achievements

Users can interact through likes, comments, replies, and saved posts.

5. Campus Jobs

Students can explore:

Companies visiting the college
Job roles and eligibility criteria
Required technical skills
Selected-student information

This helps students identify the skills they need to develop for placements.

👨‍🏫 Teacher Panel

Teachers can use Campus Hub to:

Share achievements and professional updates.
Post job-related information.
View student achievements.
Discover college events and updates.

## 🛠️ Technologies

* TypeScript
* React
* Tailwind CSS
* Vite
* SQL
* Supabase

Planned AI integrations include Gemini models, Gemini Embedding 2, hybrid matching, and RAG.

## 🔗 Project Links

* **Live Website:** https://campus-connect-ram020507.vercel.app/
* **GitHub Repository:** https://github.com/ram020507/campus-connect

## 🎯 Goal

Campus Connect aims to create a connected college ecosystem where students can access learning resources, resolve academic doubts, learn from previous solutions, participate in campus activities, and prepare for career opportunities through one centralized platform.


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


 
