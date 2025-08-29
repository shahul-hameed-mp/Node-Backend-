import {v2 as cloudinary} from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

export const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        // upload the file on cloudinary
        const result = await cloudinary.uploader.upload(localFilePath,{
            resource_type: "auto",
        });
        // file has been uploaded successful
        console.log("file is uploaded on cloudinary",result.url);
        
        return result;
    } catch (error) {
        fs.unlinkSync(localFilePath);  // remove the local saved temporary file as the upload operation got filed
        return null;
        }
};

export {uploadOnCloudinary}
