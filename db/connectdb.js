import mongoose from "mongoose";

const connectDB = async () => {
     try {
          const mongoUrl = process.env.MONGO_URL || "mongodb://localhost:27017/bot";
          await mongoose.connect(mongoUrl);
          console.log('MongoDB connected successfully');
     } catch (error) {
          console.error(error);
          process.exit(1);
     }
}

export default connectDB;