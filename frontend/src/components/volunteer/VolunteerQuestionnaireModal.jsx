import React, { useState } from "react";
import { Modal, Box, Typography, Button, TextField, Slider, Checkbox, FormControlLabel, IconButton, ToggleButton, ToggleButtonGroup } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";

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

// --- Domain-specific question sets for volunteers ---
const VOLUNTEER_QUESTION_SETS = {
  "beach cleanup": [
    { 
      key: "wasteTypes", 
      label: "What types of waste did you collect?", 
      type: "checkboxes", 
      options: [
        { value: "plastic", label: "Plastic" }, 
        { value: "glass", label: "Glass" }, 
        { value: "metal", label: "Metal" },
        { value: "organic", label: "Organic" }, 
        { value: "hazardous", label: "Hazardous" }
      ], 
      icons: { plastic: "🧴", glass: "🍾", metal: "🧲", organic: "🍃", hazardous: "☣️" } 
    },
    { 
      key: "physicalDemand", 
      label: "How physically demanding was it?", 
      type: "emoji", 
      options: [
        { value: "easy", label: "Easy", emoji: "💤" }, 
        { value: "moderate", label: "Moderate", emoji: "😌" }, 
        { value: "demanding", label: "Demanding", emoji: "😓" }, 
        { value: "exhausting", label: "Exhausting", emoji: "🥵" }
      ] 
    },
    { 
      key: "beachCleanliness", 
      label: "How clean was the beach after the event?", 
      type: "slider", 
      min: 0, 
      max: 100, 
      step: 5, 
      unit: "%" 
    },
    { 
      key: "wouldRepeat", 
      label: "Would you do this again?", 
      type: "radio", 
      options: [
        { value: "yes", label: "Yes" }, 
        { value: "maybe", label: "Maybe" }, 
        { value: "no", label: "No" }
      ] 
    }
  ],
  "tree plantation": [
    { 
      key: "saplingsPlanted", 
      label: "How many saplings did you plant?", 
      type: "counter", 
      min: 0, 
      max: 100 
    },
    { 
      key: "saplingSize", 
      label: "What size were the saplings?", 
      type: "radio", 
      options: [
        { value: "small", label: "🌱 Small" }, 
        { value: "medium", label: "🌿 Medium" }, 
        { value: "large", label: "🌳 Large" }
      ] 
    },
    { 
      key: "species", 
      label: "Which species did you plant?", 
      type: "checkboxes", 
      options: [
        { value: "neem", label: "Neem" }, 
        { value: "banyan", label: "Banyan" }, 
        { value: "mango", label: "Mango" }, 
        { value: "other", label: "Other" }
      ] 
    },
    { 
      key: "soilHardness", 
      label: "How hard was the soil?", 
      type: "emoji", 
      options: [
        { value: "easy", label: "Easy", emoji: "🏖️" }, 
        { value: "hard", label: "Hard", emoji: "🪨" }
      ] 
    },
    { 
      key: "waterProvided", 
      label: "Was water provided for the saplings?", 
      type: "radio", 
      options: [
        { value: "yes", label: "Yes" }, 
        { value: "no", label: "No" }
      ] 
    },
    { 
      key: "revisitCare", 
      label: "Would you like to revisit and care for them?", 
      type: "radio", 
      options: [
        { value: "yes", label: "Yes" }, 
        { value: "maybe", label: "Maybe" }, 
        { value: "no", label: "No" }
      ] 
    }
  ],
  "awareness drive": [
    { 
      key: "peopleTalked", 
      label: "How many people did you talk to?", 
      type: "slider", 
      min: 0, 
      max: 100, 
      step: 1, 
      unit: "people" 
    },
    { 
      key: "methods", 
      label: "Which methods did you use?", 
      type: "checkboxes", 
      options: [
        { value: "pamphlets", label: "Pamphlets" }, 
        { value: "skit", label: "Skit" }, 
        { value: "speech", label: "Speech" }, 
        { value: "posters", label: "Posters" }
      ], 
      icons: { pamphlets: "📜", skit: "🎭", speech: "🎤", posters: "🎨" } 
    },
    { 
      key: "peopleResponse", 
      label: "How did people respond?", 
      type: "emoji", 
      options: [
        { value: "veryInterested", label: "Very Interested", emoji: "😍" }, 
        { value: "interested", label: "Interested", emoji: "🙂" }, 
        { value: "indifferent", label: "Indifferent", emoji: "😐" }, 
        { value: "opposed", label: "Opposed", emoji: "😡" }
      ] 
    },
    { 
      key: "primaryRole", 
      label: "What was your primary role?", 
      type: "radio", 
      options: [
        { value: "organizer", label: "Organizer" }, 
        { value: "spokesperson", label: "Spokesperson" }, 
        { value: "support", label: "Support" }, 
        { value: "logistics", label: "Logistics" }
      ] 
    },
    { 
      key: "unansweredQuestions", 
      label: "Did anyone ask questions you couldn't answer?", 
      type: "radio", 
      options: [
        { value: "yes", label: "Yes" }, 
        { value: "no", label: "No" }
      ] 
    },
    { 
      key: "participateAgain", 
      label: "Would you like to participate in similar drives?", 
      type: "radio", 
      options: [
        { value: "yes", label: "Yes" }, 
        { value: "maybe", label: "Maybe" }, 
        { value: "no", label: "No" }
      ] 
    }
  ],
  "animal rescue": [
    { 
      key: "animalsHelped", 
      label: "How many animals did you help rescue?", 
      type: "counter", 
      min: 0, 
      max: 50 
    },
    { 
      key: "animalTypes", 
      label: "What types of animals did you assist?", 
      type: "checkboxes", 
      options: [
        { value: "dog", label: "Dog" }, 
        { value: "cat", label: "Cat" }, 
        { value: "cow", label: "Cow" }, 
        { value: "bird", label: "Bird" }, 
        { value: "other", label: "Other" }
      ], 
      icons: { dog: "🐶", cat: "🐱", cow: "🐄", bird: "🐦", other: "🐾" } 
    },
    { 
      key: "tasks", 
      label: "What tasks did you perform?", 
      type: "checkboxes", 
      options: [
        { value: "handling", label: "Handling" }, 
        { value: "feeding", label: "Feeding" }, 
        { value: "firstAid", label: "First Aid" }, 
        { value: "transport", label: "Transport" }
      ], 
      icons: { handling: "🛌", feeding: "🧃", firstAid: "🩺", transport: "🚗" } 
    },
    { 
      key: "emotionalExperience", 
      label: "How emotional was the experience for you?", 
      type: "emoji", 
      options: [
        { value: "neutral", label: "Neutral", emoji: "😐" }, 
        { value: "touching", label: "Touching", emoji: "😢" }, 
        { value: "fulfilling", label: "Fulfilling", emoji: "😍" }, 
        { value: "heartwarming", label: "Heartwarming", emoji: "🐾" }
      ] 
    },
    { 
      key: "medicalAid", 
      label: "Was proper medical aid available?", 
      type: "radio", 
      options: [
        { value: "yes", label: "Yes" }, 
        { value: "no", label: "No" }, 
        { value: "notSure", label: "Not Sure" }
      ] 
    },
    { 
      key: "volunteerAgain", 
      label: "Would you volunteer for animal rescue again?", 
      type: "radio", 
      options: [
        { value: "yes", label: "Yes" }, 
        { value: "maybe", label: "Maybe" }, 
        { value: "no", label: "No" }
      ] 
    }
  ],
  "education": [
    { 
      key: "studentsInGroup", 
      label: "How many students were in your group?", 
      type: "slider", 
      min: 0, 
      max: 100, 
      step: 1, 
      unit: "students" 
    },
    { 
      key: "gradeLevel", 
      label: "What grade level were they?", 
      type: "checkboxes", 
      options: [
        { value: "1-3", label: "1–3" }, 
        { value: "4-6", label: "4–6" }, 
        { value: "7-9", label: "7–9" }, 
        { value: "10+", label: "10+" }
      ] 
    },
    { 
      key: "topics", 
      label: "Which topics did you help teach?", 
      type: "checkboxes", 
      options: [
        { value: "environment", label: "Environment" }, 
        { value: "hygiene", label: "Hygiene" }, 
        { value: "recycling", label: "Recycling" }, 
        { value: "others", label: "Others" }
      ], 
      icons: { environment: "🌎", hygiene: "🧼", recycling: "🔄", others: "📖" } 
    },
    { 
      key: "role", 
      label: "What was your role?", 
      type: "radio", 
      options: [
        { value: "speaker", label: "Speaker" }, 
        { value: "assistant", label: "Assistant" }, 
        { value: "organizer", label: "Organizer" }, 
        { value: "techHelper", label: "Tech Helper" }
      ] 
    },
    { 
      key: "studentResponse", 
      label: "How responsive were the students?", 
      type: "emoji", 
      options: [
        { value: "quiet", label: "Quiet", emoji: "😐" }, 
        { value: "curious", label: "Curious", emoji: "🙂" }, 
        { value: "superEngaged", label: "Super Engaged", emoji: "🤩" }
      ] 
    },
    { 
      key: "teachAgain", 
      label: "Would you teach again in a future session?", 
      type: "radio", 
      options: [
        { value: "yes", label: "Yes" }, 
        { value: "maybe", label: "Maybe" }, 
        { value: "no", label: "No" }
      ] 
    }
  ]
};

// Common questions for all event types
const COMMON_QUESTIONS = [
  { 
    key: "satisfaction", 
    label: "How satisfied are you with this event?", 
    type: "slider", 
    min: 1, 
    max: 5, 
    step: 1, 
    unit: "stars" 
  },
  { 
    key: "feeling", 
    label: "Share how you feel now", 
    type: "emoji", 
    options: [
      { value: "amazing", label: "Amazing", emoji: "🥰" }, 
      { value: "accomplished", label: "Accomplished", emoji: "🙌" }, 
      { value: "content", label: "Content", emoji: "😌" }, 
      { value: "tired", label: "Tired", emoji: "😓" }, 
      { value: "frustrated", label: "Frustrated", emoji: "😠" }
    ] 
  },
  { 
    key: "recommend", 
    label: "Would you recommend this event to others?", 
    type: "radio", 
    options: [
      { value: "yes", label: "Yes" }, 
      { value: "no", label: "No" }
    ] 
  },
  { 
    key: "comments", 
    label: "Comments", 
    type: "text" 
  }
];

const renderQuestion = (q, answers, setAnswers) => {
  switch (q.type) {
    case "counter":
      return (
        <Box key={q.key} mb={2}>
          <Typography>{q.label}</Typography>
          <Counter
            value={answers[q.key] || 0}
            onChange={v => setAnswers(a => ({ ...a, [q.key]: v }))}
            min={q.min}
            max={q.max}
          />
        </Box>
      );
    case "slider":
      return (
        <SliderWithValue
          key={q.key}
          value={answers[q.key] || q.min || 0}
          onChange={v => setAnswers(a => ({ ...a, [q.key]: v }))}
          min={q.min}
          max={q.max}
          step={q.step}
          label={q.label}
          unit={q.unit}
        />
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
          multiline
          rows={3}
          value={answers[q.key] || ""}
          onChange={e => setAnswers(a => ({ ...a, [q.key]: e.target.value }))}
        />
      );
    default:
      return null;
  }
}

export default function VolunteerQuestionnaireModal({ open, onClose, eventType, onSubmit }) {
  const eventQuestions = VOLUNTEER_QUESTION_SETS[eventType?.toLowerCase()] || [];
  const allQuestions = [...eventQuestions, ...COMMON_QUESTIONS];
  const [answers, setAnswers] = useState({});

  const handleSubmit = () => {
    onSubmit(answers);
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
          Complete Volunteer Questionnaire
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Help us improve future events by sharing your experience!
        </Typography>
        {allQuestions.length === 0 ? (
          <Typography>No questionnaire available for this event type.</Typography>
        ) : (
          allQuestions.map(q => renderQuestion(q, answers, setAnswers))
        )}
        <Box mt={2} display="flex" justifyContent="flex-end" gap={2}>
          <Button onClick={onClose} variant="outlined">Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary" disabled={allQuestions.length === 0}>Submit</Button>
        </Box>
      </Box>
    </Modal>
  );
}
