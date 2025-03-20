const fetch = require('node-fetch');

// Teacher data with all the required fields
const teacherData = {
  teacherId: '67d4b05132fb49b7b0e256f3',
  firstName: 'Öğretmen',
  lastName: 'Demo',
  subject: 'Matematik',
  hourlyRate: 6000,
  hobbies: ['Kitap okumak', 'Yüzme', 'Satranç'],
  isActive: true,
  bio: 'Deneyimli matematik öğretmeni. Öğrencilere özel ders vermektedir.',
  rating: 4.5,
  ratingCount: 10,
  photoUrl: 'https://randomuser.me/api/portraits/men/1.jpg'
};

// Create the teacher conference record
async function createTeacherConference() {
  try {
    const response = await fetch('http://localhost:3006/api/teacher-conferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(teacherData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Teacher conference created successfully:', data);
  } catch (error) {
    console.error('Error creating teacher conference:', error);
  }
}

createTeacherConference();
