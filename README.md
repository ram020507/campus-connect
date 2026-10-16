# Campus Connect – A Smart College Learning Ecosystem

Campus Connect is a college-focused platform designed to bring academic learning, campus activities, and placement preparation together in one place.

---

##💡Problems Campus Connect Addresses

- **Missed Classes**: Students may miss lectures due to internships, hackathons, college events, sports, or other reasons.  
- **Limited Campus Awareness**: Students may not be aware of peers’ achievements, internships, projects, hackathons, and college events.  
- **Placement Information Gap**: Students lack visibility into companies, roles, eligibility, and required skills.  
- **Learning–Career Disconnect**: Students may struggle to understand how academic knowledge connects with industry requirements.  
- **Disconnected Information**: Learning resources, campus activities, and placement information exist separately.  

---

##💡 How Campus Connect Helps

### Learning Resources
Lecture videos, notes, PDFs, and PPTs uploaded by college staff help students access learning materials anytime.  

### AI + College Resources
An AI system will answer syllabus-related questions using relevant, college-approved learning resources.  

### Learning Feed
AI-solved doubts become reusable learning content, allowing eligible students to learn from previously answered questions.  

### Campus Hub
A professional college community where:  
- Students share achievements, hackathons, projects, and internships.  
- Teachers share academic and professional updates.  
- Colleges share official events and announcements.  

This helps students discover activities and opportunities within their own college.  

### Campus Jobs
- **All Students**: Access previous-year company recruitment information, selected-student details, LinkedIn profiles, job roles, eligibility criteria, and required skills.  
- **Final-Year Students**: Explore upcoming company job roles, eligibility criteria, and required skills when available.  

**Purpose:** Help students understand placement requirements, learn from selected students, and prepare more effectively for their careers.  

---

## ✨ What Makes Campus Connect Different?

- **Ask Once, Reuse Many**: AI checks previously solved doubts before generating a new answer.  
- **Self-Growing Learning Feed**: Every completed AI-solved doubt becomes reusable learning content.  
- **Doubt-to-Learning Cycle**: One student’s question becomes another student’s resource, helping knowledge reach more learners.  

---

## 🛠️ Technology Stack

- TypeScript – Main programming language  
- React – Interactive user interfaces  
- Tailwind CSS – Responsive and modern UI  
- Vite – Development and build tool  
- SQL – Structured data management  
- Supabase – Database, authentication, storage, and real-time updates  

---

## 🔗 Project Links

- **Live Website**: [Campus Connect](https://campus-connect-ram020507.vercel.app)

### Demo Login Credentials
- **Admin Login**  
  Username: `ram`  
  Password: `ram020507`  

- **Student Login**  
  Username: `241`  
  Password: `02-05-2007`  

- **Teacher Login**  
  Username: `123`  
  Password: `02-05-2007`  

---

**Current Status**: Prototype includes teacher-based doubt solving, a college-level Campus Hub, and Campus Jobs. AI-based doubt solving and a multi-college Campus Hub are planned for the next phase.  

## 🚀 Planned Implementations

### 1. AI-Based Doubt Solving

**Planned Technologies**:  
- Gemini 2.5 Flash – AI answer generation  
- Gemini Multimodal (VLM) – Understanding image-based questions and diagrams  
- Gemini Embedding 2 – Vector embeddings for similarity matching  
- Hybrid Matching – Keyword and vector-based matching  
- Retrieval-Augmented Generation (RAG) – Retrieving relevant college learning resources  

**Workflow**:  
Student submits a doubt → AI understands the question → Hybrid Matching checks previously solved doubts.  
- If a match is found: Display the relevant previous question and answer.  
- If no match is found: Retrieve relevant college learning resources using RAG and generate an answer using Gemini 2.5 Flash.  

---

### 2. Campus Hub – Multi-College Community
**Current Status**: Extension into a multi-college community is planned.  

**Purpose**: Allow students, teachers, and colleges to share achievements, projects, extracurricular activities, and opportunities across institutions.  

**Features**:  
- **My College**: View posts and activities from the user’s own college.  
- **Other Colleges**: Discover posts and activities from other colleges registered on Campus Connect.  

**Expected Outcome**: Students will discover activities within their own college and explore opportunities and achievements across other colleges.  

---
