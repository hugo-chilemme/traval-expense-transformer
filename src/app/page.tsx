"use client";

import { useState, useRef } from "react";
import { HackathonCard } from "@/components/hackathon-card";
import BlurFade from "@/components/magicui/blur-fade";
import BlurFadeText from "@/components/magicui/blur-fade-text";
import { ProjectCard } from "@/components/project-card";
import { ResumeCard } from "@/components/resume-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DATA } from "@/data/resume";
import Link from "next/link";
import Markdown from "react-markdown";
import { jsPDF } from "jspdf";
import JSZip from 'jszip';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
const BLUR_FADE_DELAY = 0.04;
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const labelList = {
  "traval": "Billet (Avion, Train)",
  "deplacement": "Déplacement au sol (Taxi, Bus Parking...)",
  "hebergement": "Hébergement",
  "invitation": "Invitation ou réunion",
  "repas": "Repas \"Seul\"",
}



function generateCSV(expenses) {

  let expensesList = [];

  expenses.forEach((expense, index) => {

    const p = expense.amount;
    let base = `${expense.date}, "test", ${index + 1},`;

    base += expense.type === 'traval' ? `${p},` : ',';
    base += expense.type === 'deplacement' ? `${p},` : ',';
    base += expense.type === 'hebergement' ? `${p},` : ',';
    base += expense.type === 'invitation' ? `${p},` : ',';
    base += expense.type === 'repas' ? `${p},` : ',';

    // for the moment
    base += `,,,,,"0.00",,,,"${p}"`;

    expensesList.push(base);
      
  });

  const csv = expensesList.join('\n');  
  console.log(csv);
  return csv;
}



export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState<number>(0);
  const [type, setType] = useState<string>("");
  const [id, setId] = useState<number>(-1);

  const [expenses, setExpenses] = useState([]);
  const alertDialogTriggerRef = useRef<HTMLButtonElement>(null);

  // load html file and parse 



  function handleSave() {
    // save to database
    const newExpense = {
      date: date,
      amount: parseFloat(amount).toFixed(2),
      type: type,
      file: file,
      fileName: file.name
    }

    console.log(file);

    // Convert image to PDF if necessary
    if (file && id == -1) {


      if (file.type.startsWith('image/') )
      {
        const pdf = new jsPDF();
        const reader = new FileReader();
        
        reader.onload = function(event) {
          const img = new Image();
          img.onload = function() {
            pdf.addImage(img, 'JPEG', 10, 10);
            const pdfBlob = pdf.output('blob');

            newExpense.file = new File([pdfBlob], file.name.replace(/\.[^/.]+$/, ".pdf"), {type: 'application/pdf'});

          };
          img.src = event.target?.result as string;
        };
        
        reader.readAsDataURL(file);
      } else {
        newExpense.file = file;
      }
    }

    if (id !== -1) {
      expenses[id] = newExpense;
      setExpenses([...expenses]);
    } else {
      setExpenses([...expenses, newExpense]);
    }

    setFile(null);
    setDate(new Date().toISOString().split("T")[0]);
    setAmount(0);
    setType("");
    setId(-1);
  }


  function handleExport() {

      // const csv = generateFileCSV(expenses);

      // sort by date
      expenses.sort((a, b) => 
        a.date - b.date
      )

      const zip = new JSZip();

      expenses.forEach((expense, index) => {
        if (expense.file) {
          zip.file(`${index + 1}.pdf`, expense.file);
        }
      });

      zip.generateAsync({ type: 'blob' }).then((content) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(content);
        console.log(new Date(expenses[0].date));


        a.download = `Frais de déplacement du ${new Date(expenses[0].date).toLocaleDateString('fr-FR')}.zip`;
        a.click();
        URL.revokeObjectURL(a.href);
      });



  }

  return (
    <main className="flex flex-col min-h-[100dvh] space-y-10 items-start">
      
      <h1 className="text-4xl font-bold"> Traval Expense Transformer </h1>
    
      <div className="flex flex-row w-full space-x-4">
      <Button variant="secondary" onClick={handleExport} className="bg-green-700 text-white hover:bg-green-800">
        Exporter les frais
      </Button> 

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" id="add-expense" ref={alertDialogTriggerRef}>Ajouter une note</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ajouter un frais</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="flex flex-col space-y-4 mt-8">

                  { id == -1 && (
                    <div className="flex flex-col space-y-2 p-4 border border-gray-200 rounded-lg">
                      <Label htmlFor="picture">Sélectionner un fichier</Label>
                      <Input id="picture" type="file" accept="image/*, application/pdf" 
                        onChange={(e) => {
                          setFile(e.target.files[0]);
                        }} />
                    </div>
                  )}

                <div className="flex flex-col space-y-2 p-4 border border-gray-200 rounded-lg">
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" type="date" defaultValue={new Date().toISOString().split("T")[0]} onChange={(e) => { setDate(e.target.value); }} value={date} />
                </div>


                <div className="flex flex-row space-x-4">
                <div className="flex flex-col space-y-2 p-4 border border-gray-200 rounded-lg">
                  <Label htmlFor="amount">Montant</Label>
                  <div className="flex space-x-4 pr-2">
                    <Input id="amount" type="number" placeholder="0.00" onChange={(e) => { 
                      
                      setAmount(e.target.value);
                      
                    }} value={amount} />
                    <span className="flex items-center text-gray-800">€</span>
                  </div>
                </div>

                <div className="flex flex-col space-y-2 p-4 border border-gray-200 rounded-lg">
                  <Label htmlFor="type">Type de frais</Label>
                  <Select id="type" onValueChange={(value) => { setType(value); }} value={type}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="traval">Billet (Avion, Train)</SelectItem>
                        <SelectItem value="deplacement">Déplacement au sol (Taxi, Bus Parking...)</SelectItem>
                        <SelectItem value="hebergement">Hébergement</SelectItem>
                        <SelectItem value="invitation">Invitation ou réunion</SelectItem>
                        <SelectItem value="repas">Repas "Seul"</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                </div>

              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              disabled={
                (file && expenses.some(f => f.fileName === file.fileName)) ||
                id === -1 ? (!file || !date || !amount || !type) : (!date || !amount || !type)
              }
              onClick={handleSave}
            >
              { id == -1 ? "Ajouter" : "Modifier" }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>

      <div className="flex flex-col space-y-4 w-full">
        <h2 className="text-2xl font-bold">Liste des frais</h2>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Numéro
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Montant (€)
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {expenses.map((expense, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">#{index + 1}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expense.date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expense.amount}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{labelList[expense.type]}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <Button variant="primary"
                    onClick={() => {
                      setId(index);
                      setFile(expense.file);
                      setDate(expense.date);
                      setAmount(expense.amount);
                      setType(expense.type);
                      alertDialogTriggerRef.current?.click();
                    }}
                  >Modifier</Button>
                  
                  <Button variant="destructive" onClick={() => {
                    setExpenses(expenses.filter((_, i) => i !== index));
                  }}>Supprimer</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
