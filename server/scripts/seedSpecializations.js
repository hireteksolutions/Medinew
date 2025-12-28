import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Specialization from '../models/Specialization.js';
import connectDB from '../config/database.js';

dotenv.config();

// Comprehensive list of medical specializations
const specializations = [
  // General & Primary Care
  { name: 'General Physician', description: 'General medical practitioner providing primary healthcare services' },
  { name: 'Family Medicine', description: 'Comprehensive healthcare for individuals and families of all ages' },
  { name: 'Internal Medicine', description: 'Adult medicine focusing on prevention, diagnosis, and treatment of adult diseases' },

  // Medical Specialties
  { name: 'Cardiologist', description: 'Heart specialist treating cardiovascular diseases and conditions' },
  { name: 'Neurologist', description: 'Brain and nervous system specialist treating neurological disorders' },
  { name: 'Gastroenterologist', description: 'Digestive system specialist treating gastrointestinal disorders' },
  { name: 'Pulmonologist', description: 'Lung specialist treating respiratory system diseases' },
  { name: 'Nephrologist', description: 'Kidney specialist treating kidney diseases and disorders' },
  { name: 'Endocrinologist', description: 'Hormone specialist treating diabetes, thyroid, and other endocrine disorders' },
  { name: 'Rheumatologist', description: 'Specialist in arthritis and autoimmune diseases' },
  { name: 'Hematologist', description: 'Blood disorder specialist treating blood-related conditions' },
  { name: 'Oncologist', description: 'Cancer specialist providing diagnosis and treatment of cancer' },
  { name: 'Infectious Disease Specialist', description: 'Specialist in diagnosing and treating infectious diseases' },

  // Mental Health
  { name: 'Psychiatrist', description: 'Mental health doctor specializing in diagnosis and treatment of mental disorders' },
  { name: 'Psychologist', description: 'Mental health professional providing psychological assessment and therapy' },
  { name: 'Clinical Psychologist', description: 'Licensed psychologist providing clinical mental health services' },
  { name: 'Child & Adolescent Psychiatrist', description: 'Mental health specialist for children and teenagers' },

  // Women & Child Care
  { name: 'Gynecologist', description: 'Women\'s health specialist focusing on reproductive system' },
  { name: 'Obstetrician', description: 'Pregnancy and childbirth specialist' },
  { name: 'Pediatrician', description: 'Children\'s health specialist providing medical care for infants, children, and adolescents' },
  { name: 'Neonatologist', description: 'Newborn specialist providing care for premature and critically ill newborns' },
  { name: 'Reproductive Medicine Specialist', description: 'Fertility and reproductive health specialist' },

  // Surgical Specialties
  { name: 'General Surgeon', description: 'Surgeon performing various surgical procedures' },
  { name: 'Orthopedic Surgeon', description: 'Bones and joints specialist performing orthopedic surgeries' },
  { name: 'Neurosurgeon', description: 'Brain and spine surgeon performing neurological surgeries' },
  { name: 'Cardiothoracic Surgeon', description: 'Heart and chest surgeon performing cardiac and thoracic surgeries' },
  { name: 'Plastic Surgeon', description: 'Surgeon specializing in reconstructive and cosmetic procedures' },
  { name: 'Vascular Surgeon', description: 'Blood vessel surgeon treating vascular conditions' },
  { name: 'Pediatric Surgeon', description: 'Children\'s surgeon performing surgical procedures on pediatric patients' },

  // ENT & Sensory
  { name: 'Ophthalmologist', description: 'Eye specialist diagnosing and treating eye diseases and vision problems' },
  { name: 'ENT Specialist', description: 'Ear, nose, and throat specialist treating ENT disorders' },
  { name: 'Audiologist', description: 'Hearing specialist providing hearing assessment and treatment' },

  // Dental Specialties
  { name: 'Dentist', description: 'Oral health specialist providing general dental care' },
  { name: 'Orthodontist', description: 'Teeth alignment specialist providing braces and orthodontic treatment' },
  { name: 'Oral & Maxillofacial Surgeon', description: 'Oral surgeon performing complex dental and facial surgeries' },
  { name: 'Periodontist', description: 'Gum disease specialist treating periodontal conditions' },
  { name: 'Prosthodontist', description: 'Dental prosthetics specialist providing dentures and dental implants' },

  // Diagnostic & Supportive
  { name: 'Radiologist', description: 'Medical imaging specialist interpreting X-rays, CT scans, MRIs, and other imaging studies' },
  { name: 'Pathologist', description: 'Disease diagnosis specialist examining tissues and body fluids' },
  { name: 'Anesthesiologist', description: 'Anesthesia specialist managing pain and sedation during surgery' },
  { name: 'Nuclear Medicine Specialist', description: 'Medical imaging specialist using radioactive substances for diagnosis and treatment' },

  // Lifestyle & Rehabilitation
  { name: 'Physiotherapist', description: 'Physical therapy specialist helping patients recover movement and function' },
  { name: 'Sports Medicine Specialist', description: 'Athletic injury and sports performance specialist' },
  { name: 'Rehabilitation Medicine Specialist', description: 'Physical medicine and rehabilitation specialist' },
  { name: 'Pain Management Specialist', description: 'Chronic pain specialist providing pain management and treatment' },

  // Alternative & Preventive
  { name: 'Ayurveda Doctor', description: 'Ayurvedic medicine practitioner providing traditional Indian medicine' },
  { name: 'Homeopathy Doctor', description: 'Homeopathic medicine practitioner providing alternative medicine treatment' },
  { name: 'Unani Specialist', description: 'Unani medicine practitioner providing traditional medicine treatment' },
  { name: 'Naturopathy Doctor', description: 'Naturopathic medicine practitioner focusing on natural healing methods' },
];

const seedSpecializations = async () => {
  try {
    // Connect to database
    await connectDB();
    console.log('Database connected');

    // Clear existing specializations (optional - comment out if you want to keep existing ones)
    // await Specialization.deleteMany({});
    // console.log('Cleared existing specializations');

    // Insert specializations
    let created = 0;
    let skipped = 0;

    for (const spec of specializations) {
      try {
        // Check if specialization already exists
        const existing = await Specialization.findOne({ name: spec.name });
        
        if (existing) {
          console.log(`Skipped: ${spec.name} (already exists)`);
          skipped++;
        } else {
          await Specialization.create({
            name: spec.name,
            description: spec.description,
            isActive: true
          });
          console.log(`Created: ${spec.name}`);
          created++;
        }
      } catch (error) {
        console.error(`Error creating ${spec.name}:`, error.message);
      }
    }

    console.log('\n=== Seeding Complete ===');
    console.log(`Created: ${created} specializations`);
    console.log(`Skipped: ${skipped} specializations (already exist)`);
    console.log(`Total: ${specializations.length} specializations`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding specializations:', error);
    process.exit(1);
  }
};

// Run the seed function
seedSpecializations();
