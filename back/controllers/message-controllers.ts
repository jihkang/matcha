import crud from '../lib/crud';
const Message = new crud('message');
interface User {
    from: string;
    to: string;
    room: string;
}
interface Data {
    [key: string]: string | number | undefined;
}
const create = async (user: User, content: string, status?: string) => {
    try {
        const message = await Message.create({
            set: {
                room: user.room,
                from: user.from,
                to: user.to,
                content: content,
                status: status ? status : 'pending',
            },
        });
        return message;
    } catch (error: any) {
        throw error;
    }
};

const get = async (where: any, status?: string) => {
    try {
        if (status) {
            where['status'] = status;
        }
        const message = await Message.read({
            where: where,
        });
        return message;
    } catch (error: any) {
        throw error;
    }
};

const update = async (where: any, data: Data) => {
    try {
        const message = await Message.update({
            where: where,
            set: data,
        });
        return message;
    } catch (error: any) {
        throw error;
    }
};

export default { create, get, update };
