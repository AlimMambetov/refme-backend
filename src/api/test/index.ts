import { Router } from 'express';
import { generateCode, sendEmail } from '../../utils';
import { covertCompanies } from './convert-companies.controller';

const router = Router();

router.get('/mail', async (_req, res) => {
	try {
		const { mail, title } = _req.query;
		if (!mail) throw new Error("mail key is required");

		await sendEmail(String(mail), { text: `code ${generateCode(4)}`, subject: String(title) })
		res.status(200).json({ status: 'ok' });

	} catch (error) {
		console.log(error)
		res.status(500).json({ status: JSON.stringify(error) });
	}
});

router.get('/convert-companies', covertCompanies)

export default router;
