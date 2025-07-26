import React, { useState } from "react";
import { Modal, Box, Typography, Button, TextField, Slider, Checkbox, FormControlLabel, IconButton, ToggleButton, ToggleButtonGroup, Autocomplete } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import CircularProgress from '@mui/material/CircularProgress';

// Helper: Emoji/Face rating
const EmojiRating = ({ value, onChange, options }) => (
  <ToggleButtonGroup
    value={value}
    exclusive
    onChange={(_, v) => v && onChange(v)}
    sx={{ mb: 2 }}
  >
    {options.map(opt => (
      <ToggleButton key={opt.value} value={opt.value} sx={{ fontSize: 24 }}>
        {opt.emoji} <span style={{ marginLeft: 4 }}>{opt.label}</span>
      </ToggleButton>
    ))}
  </ToggleButtonGroup>
);

// Helper: Counter
const Counter = ({ value, onChange, min = 0, max = 1000 }) => (
  <Box display="flex" alignItems="center" mb={2}>
    <IconButton onClick={() => onChange(Math.max(min, value - 1))}><RemoveIcon /></IconButton>
    <Typography variant="h6" mx={2}>{value}</Typography>
    <IconButton onClick={() => onChange(Math.min(max, value + 1))}><AddIcon /></IconButton>
  </Box>
);

// Helper: Checkbox group
const CheckboxGroup = ({ options, value = [], onChange, icons }) => (
  <Box display="flex" flexWrap="wrap" gap={2} mb={2}>
    {options.map(opt => {
      const icon = icons?.[opt.value];
      return (
        <FormControlLabel
          key={opt.value}
          control={
            <Checkbox
              checked={value.includes(opt.value)}
              onChange={(_, checked) => {
                if (checked) onChange([...value, opt.value]);
                else onChange(value.filter(v => v !== opt.value));
              }}
              {...(icon ? { icon: <span style={{fontSize: 22}}>{icon}</span>, checkedIcon: <span style={{fontSize: 22}}>{icon}</span> } : {})}
            />
          }
          label={icon ? <span style={{ fontSize: 22 }}>{icon} {opt.label}</span> : opt.label}
        />
      );
    })}
  </Box>
);

// Helper: Slider with value
const SliderWithValue = ({ value, onChange, min, max, step, label, unit }) => (
  <Box mb={2}>
    <Typography gutterBottom>
      {label}: <b>{value} {unit}</b>
    </Typography>
    <Slider
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(_, v) => onChange(v)}
      valueLabelDisplay="auto"
    />
  </Box>
);

// --- Domain-specific question sets ---
const QUESTION_SETS = {
  "beach cleanup": [
    { key: "wasteKg", label: "How much total waste was collected?", type: "slider", min: 0, max: 500, step: 1, unit: "kg" },
    { key: "wasteTypes", label: "What types of waste were found?", type: "checkboxes", options: [
      { value: "plastic", label: "Plastic" }, { value: "glass", label: "Glass" }, { value: "metal", label: "Metal" },
      { value: "organic", label: "Organic" }, { value: "hazardous", label: "Hazardous" }, { value: "ewaste", label: "E-waste" }
    ], icons: { plastic: "🧴", glass: "🍾", metal: "🧲", organic: "🍃", hazardous: "☣️", ewaste: "💻" } },
    { key: "wasteBins", label: "Estimate quantities: Drag waste icons into bins", type: "bins", options: [
      { value: "plastic", label: "Plastic", icon: "🧴" }, { value: "glass", label: "Glass", icon: "🍾" },
      { value: "metal", label: "Metal", icon: "🧲" }, { value: "organic", label: "Organic", icon: "🍃" },
      { value: "hazardous", label: "Hazardous", icon: "☣️" }
    ] },
    { key: "shorelineMeters", label: "How long was the shoreline cleaned?", type: "slider", min: 0, max: 2000, step: 10, unit: "meters" },
    { key: "localsJoined", label: "Did any local citizens or groups join in?", type: "radio", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },
    { key: "issues", label: "Were there any issues during the cleanup?", type: "checkboxes", options: [
      { value: "badWeather", label: "Bad weather" }, { value: "equipment", label: "Equipment shortage" }, { value: "other", label: "Other" }
    ] },
    { key: "issuesOther", label: "If Other, please specify", type: "text", showIf: (a) => a.issues?.includes("other") },
    { key: "mood", label: "What was the mood of the event?", type: "emoji", options: [
      { value: "great", label: "Great", emoji: "😃" }, { value: "okay", label: "Okay", emoji: "😐" }, { value: "challenging", label: "Challenging", emoji: "😞" }
    ] }
  ],
  "tree plantation": [
    { key: "saplings", label: "Number of saplings planted?", type: "counter", min: 0, max: 10000 },
    { key: "species", label: "What species were planted?", type: "checkboxes", options: [
      { value: "neem", label: "Neem" }, { value: "banyan", label: "Banyan" }, { value: "mango", label: "Mango" }, { value: "other", label: "Other" }
    ] },
    { key: "speciesOther", label: "Other species", type: "text", showIf: (a) => a.species?.includes("other") },
    { key: "area", label: "Area covered?", type: "slider", min: 0, max: 10000, step: 10, unit: "sq. ft" },
    { key: "locationType", label: "Was the planting location urban, rural, or forested?", type: "radio", options: [
      { value: "urban", label: "Urban" }, { value: "rural", label: "Rural" }, { value: "forested", label: "Forested" }
    ] },
    { key: "maintenance", label: "Who will maintain the plants?", type: "radio", options: [
      { value: "ngo", label: "Local NGO" }, { value: "community", label: "Community" }, { value: "government", label: "Government" }, { value: "volunteers", label: "Volunteers" }
    ] },
    { key: "watered", label: "Were saplings watered after planting?", type: "radio", options: [
      { value: "yes", label: "Yes" }, { value: "no", label: "No" }
    ] },
    { key: "challenges", label: "Any challenges faced?", type: "checkboxes", options: [
      { value: "drySoil", label: "Dry soil" }, { value: "lackTools", label: "Lack of tools" }, { value: "lowTurnout", label: "Low turnout" }, { value: "other", label: "Other" }
    ] },
    { key: "challengesOther", label: "If Other, please specify", type: "text", showIf: (a) => a.challenges?.includes("other") },
    { key: "success", label: "Rate the overall success.", type: "emoji", options: [
      { value: "poor", label: "Poor", emoji: "🌱" }, { value: "good", label: "Good", emoji: "🌿" }, { value: "excellent", label: "Excellent", emoji: "🌳" }
    ] }
  ],
  "awareness drive": [
    { key: "peopleReached", label: "Estimated number of people reached?", type: "slider", min: 0, max: 10000, step: 10, unit: "people" },
    { key: "mainTopic", label: "What was the main topic?", type: "checkboxes", options: [
      { value: "plasticBan", label: "Plastic Ban" }, { value: "ewaste", label: "E-Waste" }, { value: "treeProtection", label: "Tree Protection" }, { value: "climateChange", label: "Climate Change" }, { value: "other", label: "Other" }
    ] },
    { key: "mainTopicOther", label: "Other topic", type: "text", showIf: (a) => a.mainTopic?.includes("other") },
    { key: "methods", label: "What methods were used?", type: "checkboxes", options: [
      { value: "streetPlay", label: "Street Play" }, { value: "pamphlet", label: "Pamphlet Distribution" }, { value: "publicSpeaking", label: "Public Speaking" }, { value: "poster", label: "Poster Display" }, { value: "flashMob", label: "Flash Mob" }
    ] },
    { key: "collab", label: "Did you collaborate with other groups/partners?", type: "radio", options: [
      { value: "yes", label: "Yes" }, { value: "no", label: "No" }
    ] },
    { key: "collabDetails", label: "If Yes, who?", type: "text", showIf: (a) => a.collab === "yes" },
    { key: "materials", label: "What type of materials were distributed?", type: "checkboxes", options: [
      { value: "leaflets", label: "Leaflets" }, { value: "booklets", label: "Booklets" }, { value: "merchandise", label: "Merchandise" }, { value: "none", label: "None" }
    ] },
    { key: "publicResponse", label: "What was the general public response?", type: "emoji", options: [
      { value: "veryEngaged", label: "Very Engaged", emoji: "😍" }, { value: "someInterest", label: "Some Interest", emoji: "🙂" }, { value: "passive", label: "Passive", emoji: "😐" }, { value: "negative", label: "Negative", emoji: "😠" }
    ] },
    { key: "challenges", label: "Any challenges faced?", type: "checkboxes", options: [
      { value: "permissions", label: "Permissions" }, { value: "lowCrowd", label: "Low crowd" }, { value: "equipment", label: "Equipment issues" }, { value: "other", label: "Other" }
    ] },
    { key: "challengesOther", label: "If Other, please specify", type: "text", showIf: (a) => a.challenges?.includes("other") },
  ],
  "animal rescue": [
    { key: "animalsRescued", label: "How many animals were rescued?", type: "counter", min: 0, max: 1000 },
    { key: "animalTypes", label: "What types of animals were rescued?", type: "checkboxes", options: [
      { value: "dogs", label: "Dogs" }, { value: "cats", label: "Cats" }, { value: "birds", label: "Birds" }, { value: "cows", label: "Cows" }, { value: "other", label: "Others" }
    ] },
    { key: "animalTypesOther", label: "Other animals", type: "text", showIf: (a) => a.animalTypes?.includes("other") },
    { key: "condition", label: "What condition were the animals in?", type: "checkboxes", options: [
      { value: "healthy", label: "Healthy" }, { value: "injured", label: "Injured" }, { value: "critical", label: "Critical" }
    ] },
    { key: "medicalAid", label: "Was medical aid provided on-site?", type: "radio", options: [
      { value: "yes", label: "Yes" }, { value: "no", label: "No" }
    ] },
    { key: "partners", label: "Who were the rescue partners or vets?", type: "text" },
    { key: "adopted", label: "Were any animals adopted or relocated?", type: "radio", options: [
      { value: "yes", label: "Yes" }, { value: "no", label: "No" }
    ] },
    { key: "logistics", label: "Any logistical issues?", type: "checkboxes", options: [
      { value: "transport", label: "Transport" }, { value: "equipment", label: "Equipment" }, { value: "location", label: "Location access" }, { value: "none", label: "None" }
    ] },
    { key: "mood", label: "Organizer's mood post-rescue:", type: "emoji", options: [
      { value: "fulfilled", label: "Fulfilled", emoji: "🐶" }, { value: "tired", label: "Tired but Worth It", emoji: "😓" }, { value: "difficult", label: "Difficult Day", emoji: "😞" }
    ] }
  ],
  "education": [
    { key: "students", label: "Number of students engaged?", type: "counter", min: 0, max: 1000 },
    { key: "ageGroup", label: "What age/class group was taught?", type: "checkboxes", options: [
      { value: "1-3", label: "Grades 1–3" }, { value: "4-6", label: "Grades 4–6" }, { value: "7-9", label: "Grades 7–9" }, { value: "10+", label: "Grades 10+" }
    ] },
    { key: "topics", label: "What topics were covered?", type: "checkboxes", options: [
      { value: "waste", label: "Waste Management" }, { value: "pollution", label: "Pollution" }, { value: "recycling", label: "Recycling" }, { value: "climate", label: "Climate Change" }, { value: "health", label: "Health & Hygiene" }
    ] },
    { key: "tools", label: "What tools were used?", type: "checkboxes", options: [
      { value: "flashcards", label: "Flashcards" }, { value: "presentation", label: "Presentation" }, { value: "games", label: "Games" }, { value: "videos", label: "Videos" }
    ] },
    { key: "format", label: "What was the teaching format?", type: "radio", options: [
      { value: "interactive", label: "Interactive" }, { value: "lecture", label: "Lecture" }, { value: "group", label: "Group Activity" }
    ] },
    { key: "studentResponse", label: "What was the student response?", type: "emoji", options: [
      { value: "enthusiastic", label: "Very Enthusiastic", emoji: "😍" }, { value: "interested", label: "Interested", emoji: "🙂" }, { value: "quiet", label: "Quiet/Passive", emoji: "😐" }
    ] },
    { key: "teacherSupport", label: "Did teachers or school staff support the session?", type: "radio", options: [
      { value: "yes", label: "Yes" }, { value: "no", label: "No" }
    ] },
    { key: "followup", label: "Any follow-up plans or material distribution?", type: "radio", options: [
      { value: "yes", label: "Yes" }, { value: "no", label: "No" }
    ] },
    { key: "followupDetails", label: "If Yes, please specify", type: "text", showIf: (a) => a.followup === "yes" },
  ]
};

const FEEDBACK_QUESTIONS = [
  { key: "overallExperience", label: "How was your overall experience?", type: "emoji", options: [
    { value: "excellent", label: "Excellent", emoji: "😃" },
    { value: "good", label: "Good", emoji: "🙂" },
    { value: "average", label: "Average", emoji: "😐" },
    { value: "poor", label: "Poor", emoji: "😞" }
  ] },
  { key: "organization", label: "How well was the event organized?", type: "emoji", options: [
    { value: "excellent", label: "Excellent", emoji: "🏅" },
    { value: "good", label: "Good", emoji: "👍" },
    { value: "average", label: "Average", emoji: "👌" },
    { value: "poor", label: "Poor", emoji: "👎" }
  ] },
  { key: "comments", label: "Any comments or suggestions?", type: "text" }
];

function renderQuestion(q, answers, setAnswers) {
  if (q.showIf && !q.showIf(answers)) return null;
  switch (q.type) {
    case "slider":
      return (
        <SliderWithValue
          key={q.key}
          value={answers[q.key] ?? q.min}
          onChange={v => setAnswers(a => ({ ...a, [q.key]: v }))}
          min={q.min}
          max={q.max}
          step={q.step}
          label={q.label}
          unit={q.unit}
        />
      );
    case "counter":
      return (
        <Box key={q.key} mb={2}>
          <Typography>{q.label}</Typography>
          <Counter
            value={answers[q.key] ?? 0}
            onChange={v => setAnswers(a => ({ ...a, [q.key]: v }))}
            min={q.min}
            max={q.max}
          />
        </Box>
      );
    case "checkboxes":
      return (
        <Box key={q.key} mb={2}>
          <Typography>{q.label}</Typography>
          <CheckboxGroup
            options={q.options}
            value={answers[q.key] || []}
            onChange={v => setAnswers(a => ({ ...a, [q.key]: v }))}
            icons={q.icons}
          />
        </Box>
      );
    case "emoji":
      return (
        <Box key={q.key} mb={2}>
          <Typography>{q.label}</Typography>
          <EmojiRating
            value={answers[q.key] || ""}
            onChange={v => setAnswers(a => ({ ...a, [q.key]: v }))}
            options={q.options}
          />
        </Box>
      );
    case "radio":
      return (
        <Box key={q.key} mb={2}>
          <Typography>{q.label}</Typography>
          <ToggleButtonGroup
            value={answers[q.key] || ""}
            exclusive
            onChange={(_, v) => v && setAnswers(a => ({ ...a, [q.key]: v }))}
          >
            {q.options.map(opt => (
              <ToggleButton key={opt.value} value={opt.value}>
                {opt.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      );
    case "text":
      return (
        <TextField
          key={q.key}
          label={q.label}
          fullWidth
          margin="normal"
          value={answers[q.key] || ""}
          onChange={e => setAnswers(a => ({ ...a, [q.key]: e.target.value }))}
        />
      );
    // Add more gamified types as needed
    default:
      return null;
  }
}

export default function EventQuestionnaireModal({ open, onClose, eventType, onSubmit, isCreator, volunteerParticipants = [], organizerParticipants = [] }) {
  // If creator, use full question set; else, use feedback only
  const questions = isCreator
    ? (QUESTION_SETS[eventType?.toLowerCase()] || [])
    : FEEDBACK_QUESTIONS;
  const [answers, setAnswers] = useState({});
  const [mediaFiles, setMediaFiles] = useState([]);

  // Volunteer awards state
  const [bestVolunteers, setBestVolunteers] = useState([]);
  const [mostPunctual, setMostPunctual] = useState([]);
  const [customVolunteerAwards, setCustomVolunteerAwards] = useState([]); // [{ title: '', userIds: [] }]
  // Organizer awards state
  const [bestOrganizers, setBestOrganizers] = useState([]);
  const [mostDedicated, setMostDedicated] = useState([]);
  const [customOrganizerAwards, setCustomOrganizerAwards] = useState([]); // [{ title: '', userIds: [] }]

  // For adding a new custom award (volunteer)
  const [newVolunteerAwardTitle, setNewVolunteerAwardTitle] = useState("");
  const [newVolunteerAwardUsers, setNewVolunteerAwardUsers] = useState([]);
  // For adding a new custom award (organizer)
  const [newOrganizerAwardTitle, setNewOrganizerAwardTitle] = useState("");
  const [newOrganizerAwardUsers, setNewOrganizerAwardUsers] = useState([]);

  const handleMediaChange = (e) => {
    setMediaFiles(Array.from(e.target.files));
  };

  const handleAddCustomVolunteerAward = () => {
    if (!newVolunteerAwardTitle.trim() || newVolunteerAwardUsers.length === 0) return;
    setCustomVolunteerAwards([...customVolunteerAwards, { title: newVolunteerAwardTitle.trim(), userIds: newVolunteerAwardUsers }]);
    setNewVolunteerAwardTitle("");
    setNewVolunteerAwardUsers([]);
  };
  const handleRemoveCustomVolunteerAward = (idx) => {
    setCustomVolunteerAwards(customVolunteerAwards.filter((_, i) => i !== idx));
  };
  const handleAddCustomOrganizerAward = () => {
    if (!newOrganizerAwardTitle.trim() || newOrganizerAwardUsers.length === 0) return;
    setCustomOrganizerAwards([...customOrganizerAwards, { title: newOrganizerAwardTitle.trim(), userIds: newOrganizerAwardUsers }]);
    setNewOrganizerAwardTitle("");
    setNewOrganizerAwardUsers([]);
  };
  const handleRemoveCustomOrganizerAward = (idx) => {
    setCustomOrganizerAwards(customOrganizerAwards.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    // Pass answers, mediaFiles, and awards
    const awards = isCreator ? {
      volunteers: {
        bestVolunteers,
        mostPunctual,
        customAwards: customVolunteerAwards
      },
      organizers: {
        bestOrganizers,
        mostDedicated,
        customAwards: customOrganizerAwards
      }
    } : undefined;
    onSubmit(answers, mediaFiles, awards);
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{
        p: 3,
        bgcolor: "white",
        borderRadius: 2,
        boxShadow: 3,
        maxWidth: 500,
        mx: "auto",
        mt: 6,
        maxHeight: '80vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <Typography variant="h6" color="primary" gutterBottom>
          Complete Event Questionnaire
        </Typography>
        {questions.length === 0 ? (
          <Typography>No questionnaire for this event type.</Typography>
        ) : (
          questions.map(q => renderQuestion(q, answers, setAnswers))
        )}
        {/* Award selection for creator only */}
        {isCreator && (
          <>
            {/* Volunteer Awards Section */}
            <Box mt={3} mb={2}>
              <Typography variant="subtitle1" gutterBottom>Volunteer Awards</Typography>
              {/* Best Volunteer */}
              <Autocomplete
                multiple
                options={volunteerParticipants}
                getOptionLabel={u => u.name || u.email || u._id}
                value={volunteerParticipants.filter(u => bestVolunteers.includes(u._id))}
                onChange={(_, vals) => setBestVolunteers(vals.map(u => u._id))}
                renderInput={params => <TextField {...params} label="Best Volunteer(s)" margin="normal" />}
                renderOption={(props, option) => (
                  <Box component="li" {...props} display="flex" alignItems="center">
                    <img
                      src={option.profileImage ? `http://localhost:5000/uploads/Profiles/${option.profileImage}` : '/images/default-profile.jpg'}
                      alt={option.name}
                      style={{ width: 32, height: 32, borderRadius: '50%', marginRight: 8 }}
                    />
                    <span>{option.name || option.email || option._id}</span>
                  </Box>
                )}
              />
              {/* Most Punctual */}
              <Autocomplete
                multiple
                options={volunteerParticipants}
                getOptionLabel={u => u.name || u.email || u._id}
                value={volunteerParticipants.filter(u => mostPunctual.includes(u._id))}
                onChange={(_, vals) => setMostPunctual(vals.map(u => u._id))}
                renderInput={params => <TextField {...params} label="Most Punctual" margin="normal" />}
                renderOption={(props, option) => (
                  <Box component="li" {...props} display="flex" alignItems="center">
                    <img
                      src={option.profileImage ? `http://localhost:5000/uploads/Profiles/${option.profileImage}` : '/images/default-profile.jpg'}
                      alt={option.name}
                      style={{ width: 32, height: 32, borderRadius: '50%', marginRight: 8 }}
                    />
                    <span>{option.name || option.email || option._id}</span>
                  </Box>
                )}
              />
              {/* Custom Volunteer Awards */}
              <Box mt={2} mb={1}>
                <Typography variant="subtitle2">Add Custom Volunteer Award</Typography>
                <TextField
                  label="Award Title"
                  value={newVolunteerAwardTitle}
                  onChange={e => setNewVolunteerAwardTitle(e.target.value)}
                  size="small"
                  sx={{ mr: 1, width: 180 }}
                />
                <Autocomplete
                  multiple
                  options={volunteerParticipants}
                  getOptionLabel={u => u.name || u.email || u._id}
                  value={volunteerParticipants.filter(u => newVolunteerAwardUsers.includes(u._id))}
                  onChange={(_, vals) => setNewVolunteerAwardUsers(vals.map(u => u._id))}
                  renderInput={params => <TextField {...params} label="Recipients" size="small" sx={{ width: 180 }} />}
                  sx={{ display: 'inline-block', mr: 1 }}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} display="flex" alignItems="center">
                      <img
                        src={option.profileImage ? `http://localhost:5000/uploads/Profiles/${option.profileImage}` : '/images/default-profile.jpg'}
                        alt={option.name}
                        style={{ width: 28, height: 28, borderRadius: '50%', marginRight: 8 }}
                      />
                      <span>{option.name || option.email || option._id}</span>
                    </Box>
                  )}
                />
                <Button onClick={handleAddCustomVolunteerAward} variant="outlined" size="small">Add</Button>
              </Box>
              {/* List of custom volunteer awards */}
              {customVolunteerAwards.length > 0 && (
                <Box mt={1}>
                  {customVolunteerAwards.map((award, idx) => (
                    <Box key={idx} display="flex" alignItems="center" mb={1}>
                      <Typography sx={{ fontWeight: 500, mr: 1 }}>{award.title}:</Typography>
                      <Typography sx={{ color: '#555', mr: 2 }}>
                        {volunteerParticipants.filter(u => award.userIds.includes(u._id)).map(u => u.name || u.email || u._id).join(', ')}
                      </Typography>
                      <Button onClick={() => handleRemoveCustomVolunteerAward(idx)} size="small" color="error">Remove</Button>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
            {/* Organizer Awards Section */}
            <Box mt={3} mb={2}>
              <Typography variant="subtitle1" gutterBottom>Organizer Awards</Typography>
              {/* Best Organizer */}
              <Autocomplete
                multiple
                options={organizerParticipants}
                getOptionLabel={u => u.name || u.email || u._id}
                value={organizerParticipants.filter(u => bestOrganizers.includes(u._id))}
                onChange={(_, vals) => setBestOrganizers(vals.map(u => u._id))}
                renderInput={params => <TextField {...params} label="Best Organizer(s)" margin="normal" />}
                renderOption={(props, option) => (
                  <Box component="li" {...props} display="flex" alignItems="center">
                    <img
                      src={option.profileImage ? `http://localhost:5000/uploads/Profiles/${option.profileImage}` : '/images/default-profile.jpg'}
                      alt={option.name}
                      style={{ width: 32, height: 32, borderRadius: '50%', marginRight: 8 }}
                    />
                    <span>{option.name || option.email || option._id}</span>
                  </Box>
                )}
              />
              {/* Most Dedicated Organizer */}
              <Autocomplete
                multiple
                options={organizerParticipants}
                getOptionLabel={u => u.name || u.email || u._id}
                value={organizerParticipants.filter(u => mostDedicated.includes(u._id))}
                onChange={(_, vals) => setMostDedicated(vals.map(u => u._id))}
                renderInput={params => <TextField {...params} label="Most Dedicated" margin="normal" />}
                renderOption={(props, option) => (
                  <Box component="li" {...props} display="flex" alignItems="center">
                    <img
                      src={option.profileImage ? `http://localhost:5000/uploads/Profiles/${option.profileImage}` : '/images/default-profile.jpg'}
                      alt={option.name}
                      style={{ width: 32, height: 32, borderRadius: '50%', marginRight: 8 }}
                    />
                    <span>{option.name || option.email || option._id}</span>
                  </Box>
                )}
              />
              {/* Custom Organizer Awards */}
              <Box mt={2} mb={1}>
                <Typography variant="subtitle2">Add Custom Organizer Award</Typography>
                <TextField
                  label="Award Title"
                  value={newOrganizerAwardTitle}
                  onChange={e => setNewOrganizerAwardTitle(e.target.value)}
                  size="small"
                  sx={{ mr: 1, width: 180 }}
                />
                <Autocomplete
                  multiple
                  options={organizerParticipants}
                  getOptionLabel={u => u.name || u.email || u._id}
                  value={organizerParticipants.filter(u => newOrganizerAwardUsers.includes(u._id))}
                  onChange={(_, vals) => setNewOrganizerAwardUsers(vals.map(u => u._id))}
                  renderInput={params => <TextField {...params} label="Recipients" size="small" sx={{ width: 180 }} />}
                  sx={{ display: 'inline-block', mr: 1 }}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} display="flex" alignItems="center">
                      <img
                        src={option.profileImage ? `http://localhost:5000/uploads/Profiles/${option.profileImage}` : '/images/default-profile.jpg'}
                        alt={option.name}
                        style={{ width: 28, height: 28, borderRadius: '50%', marginRight: 8 }}
                      />
                      <span>{option.name || option.email || option._id}</span>
                    </Box>
                  )}
                />
                <Button onClick={handleAddCustomOrganizerAward} variant="outlined" size="small">Add</Button>
              </Box>
              {/* List of custom organizer awards */}
              {customOrganizerAwards.length > 0 && (
                <Box mt={1}>
                  {customOrganizerAwards.map((award, idx) => (
                    <Box key={idx} display="flex" alignItems="center" mb={1}>
                      <Typography sx={{ fontWeight: 500, mr: 1 }}>{award.title}:</Typography>
                      <Typography sx={{ color: '#555', mr: 2 }}>
                        {organizerParticipants.filter(u => award.userIds.includes(u._id)).map(u => u.name || u.email || u._id).join(', ')}
                      </Typography>
                      <Button onClick={() => handleRemoveCustomOrganizerAward(idx)} size="small" color="error">Remove</Button>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </>
        )}
        {/* Media upload section */}
        <Box mt={2} mb={2}>
          <Typography variant="subtitle1" gutterBottom>Upload Images & Videos</Typography>
          <Button
            variant="outlined"
            component="label"
            sx={{ mb: 1 }}
          >
            Select Files
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              hidden
              onChange={handleMediaChange}
            />
          </Button>
          <Box display="flex" flexWrap="wrap" gap={2}>
            {mediaFiles.map((file, idx) => (
              file.type.startsWith('image/') ? (
                <img
                  key={idx}
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #eee' }}
                />
              ) : file.type.startsWith('video/') ? (
                <video
                  key={idx}
                  src={URL.createObjectURL(file)}
                  style={{ width: 80, height: 80, borderRadius: 6, border: '1px solid #eee' }}
                  controls
                />
              ) : null
            ))}
          </Box>
        </Box>
        <Box mt={2} display="flex" justifyContent="flex-end" gap={2}>
          <Button onClick={onClose} variant="outlined">Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary" disabled={questions.length === 0}>Submit</Button>
        </Box>
      </Box>
    </Modal>
  );
} 