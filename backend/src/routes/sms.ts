import { Router, Request, Response } from 'express';
import { User } from '../models/User';
import { Service } from '../models/Service';
import { Booking } from '../models/Booking';

const router = Router();

function twimlResponse(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`;
}

// POST /sms/webhook — Twilio inbound SMS webhook (no auth required)
router.post('/webhook', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/xml');

  const from: string = req.body?.From ?? '';
  const body: string = (req.body?.Body ?? '').trim();
  const parts = body.split(/\s+/);
  const command = parts[0]?.toUpperCase();

  try {
    // Find user by phone number
    const user = await User.findOne({ phone: from });
    if (!user) {
      return res.send(twimlResponse('Your number is not registered. Please sign up on KisanServe first.'));
    }

    if (command === 'BOOK') {
      // BOOK <serviceId> <date> <timeSlot>
      const [, serviceId, date, timeSlot] = parts;
      if (!serviceId || !date || !timeSlot) {
        return res.send(twimlResponse('Invalid command. Send: BOOK <serviceId> <date> <timeSlot> or STATUS <bookingId>'));
      }

      const service = await Service.findById(serviceId);
      if (!service || service.status !== 'active') {
        return res.send(twimlResponse('Service not found or not available.'));
      }

      const booking = await Booking.create({
        farmer_id: user._id,
        service_id: service._id,
        provider_id: service.provider_id,
        status: 'Pending',
        date: new Date(date),
        timeSlot,
      });

      return res.send(
        twimlResponse(`Booking confirmed for ${service.type} on ${date}. Booking ID: ${booking._id}`)
      );
    }

    if (command === 'STATUS') {
      // STATUS <bookingId>
      const [, bookingId] = parts;
      if (!bookingId) {
        return res.send(twimlResponse('Invalid command. Send: BOOK <serviceId> <date> <timeSlot> or STATUS <bookingId>'));
      }

      const booking = await Booking.findById(bookingId);
      if (!booking || booking.farmer_id.toString() !== user._id.toString()) {
        return res.send(twimlResponse('Booking not found or does not belong to your account.'));
      }

      return res.send(twimlResponse(`Booking ${booking._id} status: ${booking.status}`));
    }

    // Unknown command
    return res.send(twimlResponse('Invalid command. Send: BOOK <serviceId> <date> <timeSlot> or STATUS <bookingId>'));
  } catch (err) {
    return res.send(twimlResponse('An error occurred. Please try again later.'));
  }
});

export default router;
