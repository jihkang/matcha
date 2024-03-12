import crud from '../lib/crud';
import jwt from '../utils/jwt';
import redis from '../lib/redisClient';
import elastic from '../lib/elastic';
import crypto from 'crypto';
import relationControllers from './relation-controllers';
const User = new crud('user');
const Profile = new crud('profile');
interface User {
    id?: string;
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    gender: string;
    address: string;
    verified?: number;
    status?: string;
    profile?: number;
}

interface Where {
    [key: string]: string | number | undefined;
}
class UserControllers {
    createUser = async (body: User) => {
        try {
            const { firstName, lastName, email, password, gender, address } = body;
            if (!process.env.secret) throw new Error('secret not found');
            const cryptoPass = crypto.createHmac('sha256', process.env.secret).update(password).digest('hex');
            const id = crypto.randomUUID();
            await User.create({
                set: {
                    id: id,
                    email,
                    firstName,
                    lastName,
                    password: cryptoPass,
                    gender,
                    address,
                },
            });
            const accessToken = await jwt.sign(id);
            const refreshToken = await jwt.refresh();
            return {
                accessToken,
                refreshToken,
            };
        } catch (error: any) {
            console.error('user create failed: ' + error.stack);
            throw error;
        }
    };

    getUser = async (where: Where) => {
        try {
            const user = await User.readOne({
                where: where,
                include: { table: 'profile', fk: 'userId', pk: 'id' },
            });
            return user;
        } catch (error: any) {
            throw error;
        }
    };

    getTag = async () => {
        try {
            const response = await Profile.read({});
            const tagCount: any = {};
            response.forEach((item: any) => {
                if (item.tag) {
                    item.tag.forEach((tag: string) => {
                        tagCount[tag] = tagCount[tag] ? tagCount[tag] + 1 : 1;
                    });
                }
            });
            const sorted = Object.keys(tagCount).sort((a, b) => {
                return tagCount[a] - tagCount[b];
            });
            return sorted;
        } catch (error: any) {
            throw error;
        }
    };

    updateUser = async (id: string, set: any) => {
        try {
            if (set.password) {
                if (!process.env.secret) throw new Error('secret not found');
                const cryptoPass = crypto.createHmac('sha256', process.env.secret).update(set.password).digest('hex');
                set.password = cryptoPass;
            }
            Object.keys(set).forEach((key) => {
                if (set[key] === undefined) delete set[key];
            });
            const response = await User.update({
                where: { id: id },
                set: set,
                include: { table: 'profile', fk: 'userId', pk: 'id' },
            });
            return response;
        } catch (error: any) {
            throw error;
        }
    };

    deleteUser = async (email: string) => {
        try {
            const response = await User.delete(email);
            return response;
        } catch (error: any) {
            console.error('DB delete failed: ' + error.stack);
            return error;
        }
    };

    getRecommend = async (id: string, tag?: string) => {
        try {
            const user = await this.getUser({ id: id });
            const should: any = [{ terms: { gender: user.preferences } }];
            if (tag) {
                should.push({ terms: { tag: tag } });
            }
            const bool: any = {};
            const relation = await relationControllers.getRelation({ from: id }, 'HATE');
            if (relation.length > 0) {
                const notUser = relation.map((item: any) => {
                    return item.email;
                });
                bool['must_not'] = {
                    terms: {
                        email: notUser,
                    },
                };
            }
            bool.should = should;
            const recommend = await elastic.search({ bool: bool });
            return recommend;
        } catch (error: any) {
            throw error;
        }
    };

    login = async (body: any) => {
        try {
            const { email, password } = body;
            const user = await this.getUser({ email: email });
            if (user === undefined) {
                console.log('User not found');
                return {
                    success: false,
                    error: { message: 'User not found' },
                };
            }
            if (!process.env.secret) throw new Error('secret not found');
            const cryptoPass = crypto.createHmac('sha256', process.env.secret).update(password).digest('hex');
            if (user.password === cryptoPass) {
                const accessToken = jwt.sign(user.id);
                const refreshToken = await jwt.refresh();
                await this.updateUser(user.id, { status: 'ACTIVE' });
                await redis.set(user.id, refreshToken);
                return {
                    accessToken,
                    refreshToken,
                };
            } else {
                console.log('Incorrect password');
                return {
                    success: false,
                    error: { message: 'Incorrect password' },
                };
            }
        } catch (error: any) {
            throw error;
        }
    };

    logout = async (id: string | undefined) => {
        try {
            if (id === undefined) throw new Error('id not found');
            const user = await this.getUser({ id: id });
            if (user === undefined)
                return {
                    success: false,
                    error: { message: 'User not found' },
                };
            if (user.status === 'ACTIVE') {
                await redis.del(id);
                await this.updateUser(id, { status: 'INACTIVE' });
                return { success: true };
            } else {
                return { success: false, error: { message: 'User already logged out' } };
            }
        } catch (error: any) {
            console.error('logout failed: ' + error.stack);
            throw error;
        }
    };
    createProfile = async (id?: string, body?: any) => {
        const { gender, preferences, biography, tag, age, image } = body;
        try {
            const profile = await Profile.create({
                set: {
                    ...body,
                    userId: id,
                },
            });
            return profile;
        } catch (error: any) {
            throw error;
        }
    };
}

export default new UserControllers();
