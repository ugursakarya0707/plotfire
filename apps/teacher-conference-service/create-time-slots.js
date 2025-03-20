const fetch = require('node-fetch');

// Teacher ID
const teacherId = '67d4b05132fb49b7b0e256f3';

// Create time slots for the next 7 days
async function createTimeSlots() {
  try {
    const today = new Date();
    const timeSlots = [];
    
    // Create time slots for the next 7 days
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Create 3 time slots per day (morning, afternoon, evening)
      const slots = [
        {
          teacherId,
          date: dateString,
          startTime: new Date(`${dateString}T09:00:00`).toISOString(),
          endTime: new Date(`${dateString}T10:00:00`).toISOString(),
          isBooked: false
        },
        {
          teacherId,
          date: dateString,
          startTime: new Date(`${dateString}T14:00:00`).toISOString(),
          endTime: new Date(`${dateString}T15:00:00`).toISOString(),
          isBooked: false
        },
        {
          teacherId,
          date: dateString,
          startTime: new Date(`${dateString}T18:00:00`).toISOString(),
          endTime: new Date(`${dateString}T19:00:00`).toISOString(),
          isBooked: false
        }
      ];
      
      timeSlots.push(...slots);
    }
    
    // Create time slots one by one
    for (const slot of timeSlots) {
      try {
        console.log(`Creating time slot for ${slot.date} ${new Date(slot.startTime).toLocaleTimeString()}-${new Date(slot.endTime).toLocaleTimeString()}`);
        const response = await fetch('http://localhost:3006/api/teacher-time-slots', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(slot)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Error creating time slot: Status ${response.status}, Response: ${errorText}`);
          continue;
        }
        
        const data = await response.json();
        console.log(`Time slot created successfully with ID: ${data._id}`);
      } catch (slotError) {
        console.error(`Error with individual time slot: ${slotError.message}`);
      }
    }
    
    console.log(`Attempted to create ${timeSlots.length} time slots for teacher ${teacherId}`);
  } catch (error) {
    console.error('Error creating time slots:', error);
  }
}

createTimeSlots();
