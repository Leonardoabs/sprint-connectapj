import React from "react";

interface ModalExplicacaoProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children?: React.ReactNode;
}

export const ModalExplicacao: React.FC<ModalExplicacaoProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white text-black rounded-2xl shadow-lg w-[90%] md:w-[600px] p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-gray-500 hover:text-gray-800 text-xl"
        >
          ✖
        </button>
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        <div>{children}</div>
      </div>
    </div>
  );
};
