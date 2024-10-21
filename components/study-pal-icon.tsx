import React from 'react';
import myIcon from '../public/icons/studypal.png'; // Adjust the path to your PNG file

const MyCustomIcon: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = (props) => {
  return (
    <div className="w-10 h-10 rounded-full overflow-hidden bg-primary flex items-center justify-center">
      <img
        src={myIcon.src}
        alt="AI Study Pal"
        className="w-full h-full object-cover"
        {...props}
      />
    </div>
  );
};

export default function Component() {
  return (
    <div className="p-4 bg-gray-100 flex items-center space-x-2">
      <MyCustomIcon />
    </div>
  );
}