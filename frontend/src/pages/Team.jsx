// import React from "react";
// import { motion } from "framer-motion";
// import GitHubCalendar from "react-github-calendar";
// import { FaInstagram, FaTwitter, FaFacebook, FaPhone } from "react-icons/fa";

// const TypingText = ({ texts = [] }) => {
//   const [index, setIndex] = React.useState(0);
//   const [subIndex, setSubIndex] = React.useState(0);
//   const [blink, setBlink] = React.useState(true);
//   const [reverse, setReverse] = React.useState(false);

//   React.useEffect(() => {
//     if (!texts.length) return;
//     if (index === texts.length) return;

//     if (
//       subIndex === texts[index].length + 1 &&
//       index !== texts.length - 1 &&
//       !reverse
//     ) {
//       setReverse(true);
//       return;
//     }

//     if (subIndex === 0 && reverse) {
//       setReverse(false);
//       setIndex((prev) => prev + 1);
//       return;
//     }

//     const timeout = setTimeout(() => {
//       setSubIndex((prev) => prev + (reverse ? -1 : 1));
//     }, Math.max(reverse ? 75 : subIndex === texts[index].length ? 1000 : 150, parseInt(Math.random() * 350)));

//     return () => clearTimeout(timeout);
//   }, [subIndex, index, reverse, texts]);

//   React.useEffect(() => {
//     const timeout2 = setInterval(() => {
//       setBlink((prev) => !prev);
//     }, 500);
//     return () => clearInterval(timeout2);
//   }, []);

//   if (!texts.length) return null;

//   return (
//     <h3 className="text-lg font-mono text-gray-600 dark:text-gray-300">
//       {`${texts[index].substring(0, subIndex)}${blink ? "|" : " "}`}
//     </h3>
//   );
// };

// const DeveloperCard = ({
//   name,
//   role,
//   profileImg,
//   bannerImg,
//   typingTexts,
//   skills,
//   projects,
//   education,
//   experience,
//   githubUsername,
//   contact
// }) => (
//   <div className="flex flex-col items-center w-full lg:w-1/2 p-6">
//     <motion.div
//       className="w-full mb-6 rounded-xl overflow-hidden shadow-xl"
//       initial={{ opacity: 0, y: -20 }}
//       animate={{ opacity: 1, y: 0 }}
//       transition={{ duration: 0.6 }}
//     >
//       <img src={bannerImg} alt="Banner" className="w-full h-40 object-cover" />
//     </motion.div>

//     <motion.img
//       src={profileImg}
//       alt="Profile"
//       className="w-32 h-32 rounded-full shadow-lg -mt-16 border-4 border-white"
//       initial={{ scale: 0 }}
//       animate={{ scale: 1 }}
//       transition={{ duration: 0.6 }}
//     />
//     <h2 className="text-2xl font-bold mt-4">{name}</h2>
//     <TypingText texts={typingTexts} />

//     {/* Skills */}
//     <div className="mt-6 w-full">
//       <h3 className="text-xl font-semibold mb-2">Skills</h3>
//       <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
//         {skills.map((skill, idx) => (
//           <motion.div
//             key={idx}
//             className="bg-gray-100 dark:bg-gray-800 p-2 rounded-lg text-center shadow"
//             whileHover={{ scale: 1.05 }}
//           >
//             {skill}
//           </motion.div>
//         ))}
//       </div>
//     </div>

//     {/* Projects */}
//     <div className="mt-6 w-full">
//       <h3 className="text-xl font-semibold mb-2">Projects</h3>
//       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//         {projects.map((project, idx) => (
//           <motion.div
//             key={idx}
//             className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-md hover:shadow-xl border border-gray-200 dark:border-gray-700"
//             whileHover={{ scale: 1.02 }}
//           >
//             <h4 className="font-bold mb-1">{project.title}</h4>
//             <p className="text-sm text-gray-600 dark:text-gray-400">{project.description}</p>
//           </motion.div>
//         ))}
//       </div>
//     </div>

//     {/* Education */}
//     <div className="mt-6 w-full">
//       <h3 className="text-xl font-semibold mb-2">Education</h3>
//       <div className="space-y-4">
//         {education.map((edu, idx) => (
//           <motion.div
//             key={idx}
//             className="flex items-center space-x-4 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg shadow"
//             whileHover={{ scale: 1.02 }}
//           >
//             <img src={edu.logo} alt="institute logo" className="w-12 h-12 object-contain" />
//             <div>
//               <p className="font-semibold">{edu.institute}</p>
//               <p className="text-sm text-gray-500 dark:text-gray-400">{edu.degree} ({edu.year})</p>
//             </div>
//           </motion.div>
//         ))}
//       </div>
//     </div>

//     {/* Experience */}
//     <div className="mt-6 w-full">
//       <h3 className="text-xl font-semibold mb-2">Experience</h3>
//       <ol className="relative border-s border-gray-300 dark:border-gray-600">
//         {experience.map((exp, idx) => (
//           <motion.li
//             key={idx}
//             className="mb-6 ms-4"
//             initial={{ opacity: 0, x: -10 }}
//             whileInView={{ opacity: 1, x: 0 }}
//             transition={{ duration: 0.5, delay: idx * 0.2 }}
//           >
//             <div className="absolute w-3 h-3 bg-blue-500 rounded-full -start-1.5 mt-1.5"></div>
//             <h4 className="font-semibold">{exp.role}</h4>
//             <p className="text-sm text-gray-600 dark:text-gray-400">{exp.company} ({exp.duration})</p>
//           </motion.li>
//         ))}
//       </ol>
//     </div>

//     {/* GitHub Graph */}
//     <div className="mt-6 w-full">
//       <h3 className="text-xl font-semibold mb-2">GitHub Contributions</h3>
//       <motion.div
//         initial={{ opacity: 0, y: 20 }}
//         whileInView={{ opacity: 1, y: 0 }}
//         transition={{ duration: 0.6 }}
//       >
//         <GitHubCalendar username={githubUsername} blockSize={15} blockMargin={5} colorScheme="dark" />
//       </motion.div>
//     </div>

//     {/* Contact & Socials */}
//     <div className="mt-6 w-full">
//       <h3 className="text-xl font-semibold mb-2">Contact & Socials</h3>
//       <div className="flex space-x-4 items-center">
//         <a href={contact.instagram} target="_blank" rel="noreferrer">
//           <FaInstagram className="text-pink-500 text-2xl hover:scale-110" />
//         </a>
//         <a href={contact.twitter} target="_blank" rel="noreferrer">
//           <FaTwitter className="text-blue-400 text-2xl hover:scale-110" />
//         </a>
//         <a href={contact.facebook} target="_blank" rel="noreferrer">
//           <FaFacebook className="text-blue-600 text-2xl hover:scale-110" />
//         </a>
//         <p className="text-sm text-gray-700 dark:text-gray-300">
//           <FaPhone className="inline mr-1" /> {contact.phone}
//         </p>
//       </div>
//     </div>
//   </div>
// );

// const Team = () => {
//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 dark:from-gray-900 dark:to-gray-800 p-8">
//       <div className="text-center mb-10">
//         <h1 className="text-4xl font-bold mb-2">Meet the Developers</h1>
//         <p className="text-gray-600 dark:text-gray-400">Passionate, Professional & Creative</p>
//       </div>
//       <div className="relative flex flex-col lg:flex-row items-stretch gap-8">
//         <DeveloperCard
//           name="Sidhik Thorat"
//           role="Full Stack Developer"
//           profileImg="../backend/uploads/sidhik-profile.jpg"
//           bannerImg="/sidhik-banner.jpg"
//           typingTexts={["Full Stack Developer", "DSA Enthusiast", "Problem Solver"]}
//           skills={["React", "Node.js", "Express", "MongoDB", "Tailwind", "Git", "Redux", "Bootstrap", "Java", "Framer Motion", "HTML", "CSS", "JavaScript", "TypeScript"]}
//           projects={[
//             { title: "Students Project Management System", description: "College Students Projects maintainance tool." },
//             { title: "Translator-Hire", description: "Human Translator Hiring Platform." },
//             { title: "PrakritiMitra", description: "NGO, Organizer, Volunteer Manager." },
//             { title: "Face Recognition Based Attendance System", description: "Attendance tracking based on Facial Features." },
//           ]}
//           education={[
//             { institute: "Samarth Ramdas Vidyalaya", degree: "Secondary Education", year: "2020", logo: "/school-logo.png" },
//             { institute: "Dr. Babasaheb Ambedkar Technological University", degree: "Diploma", year: "2020-2023", logo: "/college-logo.png" },
//             { institute: "Vivekanand Education Society's Institute of Technology", degree: "B.Tech ECS", year: "2023-2026", logo: "/university-logo.png" },
//           ]}
//           experience={[
//             { company: "Kopran PVT LMT", role: "Web Developer", duration: "May 2023 - July 2023" },
//           ]}
//           githubUsername="SidhikThorat"
//           contact={{
//             instagram: "https://instagram.com/sidhik",
//             twitter: "https://twitter.com/sidhik",
//             facebook: "https://facebook.com/sidhik",
//             phone: "+91 8855995319",
//           }}
//         />

//         {/* Middle Divider */}
//         <motion.div
//           className="hidden lg:block w-1 bg-gradient-to-b from-blue-400 to-purple-600 rounded-full"
//           initial={{ height: 0 }}
//           animate={{ height: "100%" }}
//           transition={{ duration: 1.2 }}
//         />

//         <DeveloperCard
//           name="Amrut Pathane"
//           role="Software Engineer"
//           profileImg="/amrut-profile.jpg"
//           bannerImg="/amrut-banner.jpg"
//           typingTexts={["Backend Developer", "DSA Enthusiast", "UI/UX Designer"]}
//           skills={["React", "Node.js", "Express", "MongoDB", "Tailwind", "Git", "Redux", "Bootstrap", "Java", "Framer Motion", "HTML", "CSS", "JavaScript", "TypeScript", "GSAP"]}
//           projects={[
//             { title: "Students Project Management System", description: "College Students Projects maintainance tool." },
//             { title: "Expense Tracker", description: "Personal Expense Manager." },
//             { title: "PrakritiMitra", description: "NGO, Organizer, Volunteer Manager." },
//             { title: "ChatBridge", description: "Real-time messaging app." },
//           ]}
//           education={[
//             { institute: "Sunrise Public School", degree: "Schooling", year: "2010-2016", logo: "/school-logo2.png" },
//             { institute: "Alpha PU College", degree: "Secondary Education", year: "2016-2018", logo: "/college-logo2.png" },
//             { institute: "Innovate Institute of Tech", degree: "B.Tech CSE", year: "2018-2022", logo: "/university-logo2.png" },
//           ]}
//           experience={[
//             { company: "DevSolutions", role: "Backend Intern", duration: "Feb 2023 - Jul 2023" },
//             { company: "TechOcean", role: "Software Engineer", duration: "Aug 2023 - Present" },
//           ]}
//           githubUsername="Amrut00"
//           contact={{
//             instagram: "https://instagram.com/amrut",
//             twitter: "https://twitter.com/amrut",
//             facebook: "https://facebook.com/amrut",
//             phone: "+91 87654 32109",
//           }}
//         />
//       </div>
//     </div>
//   );
// };

// export default Team;





import React from "react";
import { motion } from "framer-motion";
import { FaGithub, FaLinkedin, FaEnvelope } from "react-icons/fa";

const teamMembers = [
  {
    name: "Sidhik Thorat",
    role: "Full Stack Developer",
    img: "/sidhik-profile.jpg",
    bio: "Final-year B.Tech student passionate about building scalable and impactful solutions for NGOs.",
    github: "https://github.com/SidhikThorat",
    linkedin: "https://www.linkedin.com/in/sidhik-thorat-546549258/",
    email: "mailto:sidhikthoratjob08@example.com",
  },
  {
    name: "Amrut Pathane",
    role: "Backend Developer & UI/UX Enthusiast",
    img: "/amrut-profile.jpg",
    bio: "Final-year B.Tech student focused on creating seamless, user-friendly platforms that make a difference.",
    github: "https://github.com/Amrut00",
    linkedin: "https://www.linkedin.com/in/amrut-pathane/",
    email: "mailto:amrut@example.com",
  },
];

const values = [
  { title: "Transparency", desc: "We believe in open, honest, and accountable solutions." },
  { title: "Accessibility", desc: "Making NGO tools simple, intuitive, and easy to use." },
  { title: "Sustainability", desc: "Building features that last and help long-term causes." },
];

const Team = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 text-gray-800 dark:text-gray-200">
      {/* Hero Section */}
      <section className="text-center py-12 px-4">
        <motion.h1
          className="text-4xl font-bold mb-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Meet the Team Behind <span className="text-green-600">PrakritiMitra</span>
        </motion.h1>
        <motion.p
          className="max-w-2xl mx-auto text-lg text-gray-600 dark:text-gray-300"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          We’re two final-year B.Tech students passionate about empowering NGOs
          with tools to manage activities, volunteers, and events in one seamless platform.
        </motion.p>
      </section>

      {/* Team Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-8 px-6 max-w-5xl mx-auto">
        {teamMembers.map((member, idx) => (
          <motion.div
            key={idx}
            className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md rounded-2xl shadow-lg p-6 flex flex-col items-center text-center border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all"
            whileHover={{ scale: 1.03 }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: idx * 0.2 }}
          >
            <img
              src={member.img}
              alt={member.name}
              className="w-28 h-28 rounded-full border-4 border-green-500 object-cover mb-4 shadow-md"
            />
            <h2 className="text-xl font-semibold">{member.name}</h2>
            <p className="text-green-600 dark:text-green-400 font-medium">{member.role}</p>
            <p className="mt-3 text-gray-600 dark:text-gray-300 text-sm">{member.bio}</p>
            <div className="flex space-x-4 mt-4">
              <a href={member.github} target="_blank" rel="noreferrer">
                <FaGithub className="text-xl hover:text-green-600 transition" />
              </a>
              <a href={member.linkedin} target="_blank" rel="noreferrer">
                <FaLinkedin className="text-xl hover:text-green-600 transition" />
              </a>
              <a href={member.email}>
                <FaEnvelope className="text-xl hover:text-green-600 transition" />
              </a>
            </div>
          </motion.div>
        ))}
      </section>

      {/* Values Section */}
      <section className="py-12 px-6 max-w-4xl mx-auto">
        <motion.h2
          className="text-2xl font-bold text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          Our Values
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {values.map((value, idx) => (
            <motion.div
              key={idx}
              className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.2 }}
            >
              <h3 className="text-green-600 dark:text-green-400 font-semibold mb-2">{value.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">{value.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Team;
