import userControllers from '../controllers/user-controllers';
import relationControllers from '../controllers/relation-controllers';
import elastic from '../lib/elastic';

const checkEmail = async (req: any, res: any) => {
    try {
        if (req.query['email']) {
            const response = await userControllers.getUser(req.query['email']);
            if (response === undefined) {
                res.status(200).json({ success: true });
                return;
            }
            res.status(404).json({
                success: false,
                error: { message: 'User already exists' },
            });
        } else {
            res.status(400).json({ success: false, error: { message: 'Invalid email' } });
        }
    } catch (error: any) {
        console.error('checkEmail failed: ' + error.stack);
        res.status(500).json({ success: false, error: { message: 'checkEmail failed : server error' } });
    }
};

const checkProfileVerify = async (req: any, res: any, next: any) => {
    try {
        const response = await userControllers.getUser(req.email);
        if (response === undefined) {
            res.status(404).json({ success: false, error: { message: 'User not found' } });
            return;
        }
        if (response.verified === 1 && response.profile === 1) {
            next();
        } else if (response.profile === 0) {
            res.status(404).json({ success: false, error: { message: 'Profile not found' } });
        } else {
            res.status(404).json({ success: false, error: { message: 'User not verified' } });
        }
    } catch (error: any) {
        console.error('checkProfileVerify failed: ' + error.stack);
        res.status(500).json({ success: false, error: { message: 'checkProfileVerify failed : server error' } });
    }
};

const get = async (req: any, res: any) => {
    try {
        const response = await userControllers.getUser(req.params.email);
        if (response === undefined) {
            res.status(404).json({ success: false, error: { message: 'User not found' } });
            return;
        } else {
            const { id, password, verified, userId, profileId, ...rest } = response;
            if (req.email === req.params.email) {
                rest['relaiton'] = 'me';
            } else {
                const relation = await relationControllers.getRelation({
                    from: req.email,
                    to: req.params.email,
                });
                // rest['relation'] = relation?.status;
            }
            res.status(200).json({
                success: true,
                data: rest,
            });
        }
    } catch (error: any) {
        console.error('getUser failed: ' + error.stack);
        res.status(500).json({ success: false, error: { message: 'getUser failed : server error' } });
    }
};

const update = async (req: any, res: any) => {
    try {
        const user = await userControllers.getUser(req.email);
        if (user === undefined) {
            res.status(404).json({ success: false, error: { message: 'User not found' } });
            return;
        }
        if (user.profile === 0) {
            const response = await userControllers.createProfile(req.email, req.body);
            if (response) req.body['profile'] = 1;
        }
        const data = await userControllers.updateUser(req.email, req.body);
        const { id, password, verified, userId, profile, profileId, ...rest } = data;
        if (verified === 1) {
            await elastic.update(req.email, rest);
        }
        res.status(201).json({
            success: true,
            data: rest,
        });
    } catch (error: any) {
        console.error('updateUser failed: ' + error.stack);
        res.status(500).json({ success: false, error: { message: 'updateUser failed : server error' } });
    }
};

const getRecommend = async (req: any, res: any) => {
    try {
        const user = await userControllers.getRecommend(req.email, req.query.tag);
        res.status(200).json({ success: true, data: user });
    } catch (error: any) {
        console.error('getRecommend failed: ' + error.stack);
        res.status(500).json({ success: false, error: { message: 'getRecommend failed : server error' } });
    }
};

const getTag = async (req: any, res: any) => {
    try {
        const response = await userControllers.getTag();
        res.status(200).json({ success: true, data: response });
    } catch (error: any) {
        console.error('getTag failed: ' + error.stack);
        res.status(500).json({ success: false, error: { message: 'getTag failed : server error' } });
    }
};

export default { checkEmail, get, update, checkProfileVerify, getRecommend, getTag };
