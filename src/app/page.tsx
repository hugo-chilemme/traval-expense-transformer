"use client";

import { useState, useRef, useEffect } from "react";
import { jsPDF } from "jspdf";
import JSZip from 'jszip';
import Image from "next/image";


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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const labelList = {
  "traval": "Billet (Avion, Train)",
  "deplacement": "Déplacement au sol (Taxi, Bus Parking...)",
  "hebergement": "Hébergement",
  "invitation": "Invitation ou réunion",
  "repas": "Repas \"Seul\"",
};

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState<number>(0);
  const [type, setType] = useState<string>("");
  const [id, setId] = useState<number>(-1);
  const [reason, setReason] = useState<string>("");
  const [expenses, setExpenses] = useState<any[]>([]);
  const alertDialogTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const savedExpenses = localStorage.getItem('expenses');
    if (savedExpenses) {
      setExpenses(JSON.parse(savedExpenses));
    }
  }, []);

  useEffect(() => {

    if (expenses.length > 0)
    {
      localStorage.setItem('expenses', JSON.stringify(expenses));
    }
  }, [expenses]);

  function handleSave() {


    const newExpense = {
      date: date,
      uuid: new Date().getTime().toString(),
      amount: parseFloat(parseFloat(amount.toString()).toFixed(2)),
      type: type,
      file: file,
      reason: reason,
    };

    if (file && id === -1) {
      if (file.type.startsWith('image/')) {
        const pdf = new jsPDF();
        const reader = new FileReader();
        reader.onload = function (event) {
          const img = new window.Image();
          img.onload = function () {
            pdf.addImage(img, 'JPEG', 10, 10, img.width, img.height);
            const pdfBlob = pdf.output('blob');
            const pdfFile = new File([pdfBlob], file.name.replace(/\.[^/.]+$/, ".pdf"), { type: 'application/pdf' });
            newExpense.file = pdfFile;
            localStorage.setItem(newExpense.uuid, event.target?.result as string);
            saveExpense(newExpense);
          };

          img.src = event.target?.result as string;
        };

        reader.readAsDataURL(file);
      } else {
        newExpense.file = file;

        // save also in local storage in base64
        const reader = new FileReader();

        reader.onload = function (event) {
          localStorage.setItem(newExpense.uuid, event.target?.result as string);
          saveExpense(newExpense);
        };

        reader.readAsDataURL(file);

               

        saveExpense(newExpense);
      }
    } else {
      saveExpense(newExpense);
    }

    function saveExpense(expense: any) {
      if (id !== -1) {
        expenses[id] = expense;
        setExpenses([...expenses]);
      } else {
        setExpenses([...expenses, expense]);
      }

      setFile(null);
      setDate(new Date().toISOString().split("T")[0]);
      setAmount(0);
      setType("");
      setId(-1);
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


    if (expenses.length === 0)
    {
      return alert('Aucune donnée à exporter');
    }

    expenses.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const zip = new JSZip();

    expenses.forEach((expense, index) => {
      if (expense.file) {
        const base64File = localStorage.getItem(expense.uuid);
        if (base64File) {
          const byteCharacters = atob(base64File.split(',')[1]);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          zip.file(`${index + 1}.pdf`, byteArray, { binary: true });
        }
      }
    });
    
    zip.generateAsync({ type: 'blob' }).then((content) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(content);
      a.download = `Frais de déplacement du ${new Date(expenses[0].date).toLocaleDateString('fr-FR')}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }
  
  return (
    <main className="flex flex-col min-h-[100dvh] space-y-10 items-start">
      <h1 className="text-4xl font-bold"> Gestion des frais de déplacement</h1>
     
      <div className="flex flex-row w-full space-x-4">
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" id="add-expense" ref={alertDialogTriggerRef}>Ajouter une note</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Ajouter un frais</AlertDialogTitle>
              <AlertDialogDescription>

                {file && file.type.startsWith('image/') && (
                  <div className="overflow-auto max-h-[200px]">
                  <Image src={file ? URL.createObjectURL(file) : ''} alt="Image" width={450} height={200} className="rounded-lg overflow-hidden w-full h-auto object-cover" />
                  </div>
                )}
                {file && file.type === 'application/pdf' && (
                  <embed src={file ? URL.createObjectURL(file) : ''} width="450" height="200" type="application/pdf" />
                )}


                <div className="flex flex-col space-y-4 mt-8">
                  {id === -1 && (
                    <div className="flex flex-col space-y-2 p-4 border border-gray-200 rounded-lg">
                      <Label htmlFor="picture">Sélectionner un fichier</Label>
                      <Input id="picture" type="file" accept="image/*, application/pdf"
                        onChange={(e) => {
                          if (e.target.files) {
                            setFile(e.target.files[0]);
                          }
                        }} />
                    </div>
                  )}
                  <div className="flex flex-col space-y-2 p-4 border border-gray-200 rounded-lg">
                    <Label htmlFor="date">Date</Label>
                    <Input id="date" type="date" defaultValue={new Date().toISOString().split("T")[0]} onChange={(e) => setDate(e.target.value)} value={date} />
                  </div>
                  <div className="flex flex-col space-y-2 p-4 border border-gray-200 rounded-lg">
                    <Label htmlFor="reason">Raison</Label>
                    <Input id="reason" type="text" placeholder="Raison du frais" onChange={(e) => setReason(e.target.value)} value={reason} />
                  </div>
                  <div className="flex flex-row space-x-4">
                    <div className="flex flex-col space-y-2 p-4 border border-gray-200 rounded-lg">
                      <Label htmlFor="amount">Montant</Label>
                      <div className="flex space-x-4 pr-2">
                        <Input id="amount" type="number" placeholder="0.00" onChange={(e) => setAmount(parseFloat(e.target.value))} value={amount} />
                        <span className="flex items-center text-gray-800">€</span>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2 p-4 border border-gray-200 rounded-lg">
                      <Label htmlFor="type">Type de frais</Label>
                      <Select onValueChange={(value) => setType(value)} value={type} defaultValue="">
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="traval">Billet (Avion, Train)</SelectItem>
                            <SelectItem value="deplacement">Déplacement au sol (Taxi, Bus Parking...)</SelectItem>
                            <SelectItem value="hebergement">Hébergement</SelectItem>
                            <SelectItem value="invitation">Invitation ou réunion</SelectItem>
                            <SelectItem value="repas">Repas &quot;Seul&quot;</SelectItem>
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
                  id === -1 ? (!file || !date || !amount || !type) : (!date || !amount || !type)
                }
                onClick={handleSave}
              >
                {id === -1 ? "Ajouter" : "Modifier"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button variant="secondary" onClick={handleExport} className="bg-green-700 text-white hover:bg-green-800">
          Exporter les frais
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Réinitialiser</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Voulez-vous vraiment réinitialiser ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600"

                onClick={() => {
                  localStorage.clear();
                  setExpenses([]);
                }}
              >
                Réinitialiser
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
            {expenses.map((expense: { date: string; amount: number; type: keyof typeof labelList; reason: string; file: File | null; uuid: string }, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">#{index + 1}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expense.date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expense.amount}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {expense.reason && <p className="text-gray-700 font-semibold mb-1">{expense.reason}</p>}
                  {labelList[expense.type]}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <Button variant="default"
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
                    setExpenses(expenses.filter((_, i) => i !== index))
                    localStorage.removeItem(expense.uuid);
                    localStorage.setItem('expenses', JSON.stringify(expenses.filter((_, i) => i !== index)));
                  }}>Supprimer</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-neutral-600"><strong>Vos données restent à l&quot;abris</strong> dans votre navigateur. Vous pouvez les exporter à tout moment. Elles ne sont pas partagées avec des tiers ou stockées sur un serveur.</p>
    </main>
  );
}
