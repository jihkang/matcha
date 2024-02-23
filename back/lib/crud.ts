import fs from 'fs';
import mysql from 'mysql2/promise';
const dbConfig = {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: Number(process.env.MYSQL_PORT),
    connectionLimit: 10,
    multipleStatements: true,
};

interface update {
    data: updateData;
    where: {
        [key: string]: string | number;
    };
}
interface updateData {
    [key: string]: string | number | boolean | object | undefined;
}
interface createData {
    [key: string]: string | number | boolean | object | undefined;
}
const pool = mysql.createPool(dbConfig);
class crud {
    private connection: mysql.PoolConnection | undefined;
    private table: string;
    constructor(table: string) {
        this.getConnection();
        this.table = table;
    }
    async migrate() {
        try {
            this.connection = await this.getConnection();
            const sql = await fs.promises.readFile(__dirname + '/../sql/init.sql', 'utf-8');
            await this.connection.query(sql);
            console.log('DB migration success');
            this.connection.release();
        } catch (error: any) {
            console.error('DB migration failed: ' + error.stack);
        }
    }

    async getConnection() {
        try {
            return await pool.getConnection();
        } catch (error: any) {
            throw error;
        }
    }
    async create(data: createData) {
        try {
            this.connection = await this.getConnection();
            Object.keys(data).forEach((key) => {
                if (typeof data[key] === 'object') data[key] = JSON.stringify(data[key]);
            });
            const sql = fs.readFileSync(__dirname + '/../sql/create.sql', 'utf-8');
            console.log(this.connection.format(sql, [this.table, data]));
            const response = await this.connection.query(sql, [this.table, data]);
            this.connection.release();
            return response;
        } catch (error: any) {
            console.error('DB create failed: ' + error.stack);
            if (this.connection) this.connection.release();
            throw error;
        }
    }

    async readOne(data: any): Promise<any> {
        try {
            const { where, include } = data;
            let table = [this.table];
            if (include) {
                Object.keys(include).forEach((key) => {
                    if (include[key] === true) table.push(key);
                });
            }
            const sql = fs.readFileSync(__dirname + '/../sql/readone.sql', 'utf-8');
            this.connection = await this.getConnection();
            console.log(table);
            console.log(this.connection.format(sql, [table, where]));
            const [row] = await this.connection.query<mysql.RowDataPacket[]>(sql, [this.table, where]);
            console.log(row[0]);
            this.connection.release();
            return row[0];
        } catch (error: any) {
            console.error('DB read failed: ' + error.stack);
            if (this.connection) this.connection.release();
            throw error;
        }
    }
    async read(data: any) {
        try {
            this.connection = await this.getConnection();
            const { where } = data;
            let value: any = [this.table];
            let sql = `SELECT * FROM ?? WHERE ?`;
            if (Array.isArray(where)) {
                where.map((item: any, index) => {
                    Object.entries(item).forEach(([key, values], i) => {
                        let valueJson: any = {};
                        valueJson[key] = values;
                        value.push(valueJson);
                        if (i !== Object.keys(item).length - 1) {
                            sql += ` AND ?`;
                        }
                    });
                    if (index !== where.length - 1) {
                        sql += ` OR ?`;
                    }
                });
            }
            console.log(this.connection.format(sql, value));
            const [row] = await this.connection.query(sql, value);
            this.connection.release();
            return row;
        } catch (error: any) {
            console.error('DB read failed: ' + error.stack);
            if (this.connection) this.connection.release();
            return error;
        }
    }

    async update(body: update) {
        try {
            const { data, where } = body;
            Object.keys(data).forEach((key) => {
                if (data[key] === undefined) delete data[key];
                if (typeof data[key] === 'object') data[key] = JSON.stringify(data[key]);
            });
            if (Object.keys(data).length === 0) throw new Error('No data to update');
            this.connection = await this.getConnection();
            const sql = fs.readFileSync(__dirname + '/../sql/update.sql', 'utf-8');
            const response = await this.connection.query(sql, [this.table, data, where]);
            this.connection.release();
            return response;
        } catch (error: any) {
            console.error('DB update failed: ' + error.stack);
            if (this.connection) this.connection.release();
            return error;
        }
    }
    async delete<T>(where: T) {
        try {
            this.connection = await this.getConnection();
            const sql = `DELETE FROM ?? WHERE ?`;
            const response = await this.connection.query(sql, [this.table, where]);
        } catch (error: any) {
            console.error('DB delete failed: ' + error.stack);
            if (this.connection) this.connection.release();
            return error;
        }
    }
}

export default crud;
