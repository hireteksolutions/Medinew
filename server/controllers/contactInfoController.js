import ContactInfo from '../models/ContactInfo.js';

// @desc    Get contact information
// @route   GET /api/contact-info
// @access  Public
export const getContactInfo = async (req, res) => {
  try {
    const contactInfo = await ContactInfo.getContactInfo();
    res.json(contactInfo);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update contact information
// @route   PUT /api/contact-info
// @access  Private/Admin
export const updateContactInfo = async (req, res) => {
  try {
    let contactInfo = await ContactInfo.findOne({ isActive: true });
    
    if (!contactInfo) {
      // Create new contact info if none exists
      contactInfo = new ContactInfo(req.body);
      await contactInfo.save();
      return res.json(contactInfo);
    }

    // Update existing contact info
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        if (typeof req.body[key] === 'object' && !Array.isArray(req.body[key])) {
          // Handle nested objects like officeHours and socialMedia
          contactInfo[key] = { ...contactInfo[key], ...req.body[key] };
        } else {
          contactInfo[key] = req.body[key];
        }
      }
    });

    await contactInfo.save();
    res.json(contactInfo);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

