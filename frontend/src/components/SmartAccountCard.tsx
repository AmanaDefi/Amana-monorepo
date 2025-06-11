type SmartAccountCardProps = {
  title: string;
  description: string;
  list?: string[];
  note?: string;
};

const SmartAccountCard = ({
  title,
  description,
  list,
  note,
}: SmartAccountCardProps) => {
  return (
    <div className="p-4 rounded-md shadow-md bg-dark-card">
      {" "}
      <h3 className="font-bold mb-2 text-white">{title}</h3>
      <p className="text-white whitespace-pre-line">{description}</p>
      {list && (
        <ul className="list-disc pl-4 my-2 text-white">
          {list.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      )}
      {note && <p className="text-white mt-2 italic">{note}</p>}
    </div>
  );
};

export default SmartAccountCard;
