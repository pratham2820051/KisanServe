import { Router } from 'express';
import { listServices, createService, updateService, deleteService } from '../controllers/serviceController';
import { authenticate } from '../middleware/auth';
import { providerOnly } from '../middleware/rbac';

const router = Router();

// GET /services — public endpoint, no auth required for browsing (Requirement 2.2)
router.get('/', listServices);

// POST /services — Service_Provider creates a new listing (Requirements: 8.1)
router.post('/', authenticate, providerOnly, createService);

// PATCH /services/:id — Service_Provider updates their listing (Requirements: 8.2)
router.patch('/:id', authenticate, providerOnly, updateService);

// DELETE /services/:id — Service_Provider deletes their listing (Requirements: 8.5)
router.delete('/:id', authenticate, providerOnly, deleteService);

export default router;
