import React, { useState } from 'react';
import { Modal, Box, Typography, Button, FormControlLabel, Checkbox, CircularProgress } from '@mui/material';
import { toast } from 'react-toastify';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 2
};

const DebtCertificateModal = ({ open, handleClose, clientData }) => {
  const [includeFio, setIncludeFio] = useState(false);
  const [includeStamp, setIncludeStamp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const token = localStorage.getItem('token');

      // Helper to safely extract client name from complex objects
      let clientName = "";
      if (clientData?.client_name) clientName = clientData.client_name;
      else if (clientData?.name) clientName = clientData.name;
      else if (clientData?.FullName) clientName = clientData.FullName;

      let uniqNumber = "";
      if (clientData?.pin) uniqNumber = clientData.pin;
      else if (clientData?.uniq_number) uniqNumber = clientData.uniq_number;
      else if (clientData?.Uniq) uniqNumber = clientData.Uniq;

      let birthDate = "";
      if (clientData?.birth_date) birthDate = clientData.birth_date;
      else if (clientData?.BirthDate) birthDate = clientData.BirthDate;

      const payload = {
        include_fio: includeFio,
        include_stamp: includeStamp,
        uniq_number: String(uniqNumber),
        client_name: String(clientName),
        birth_date: String(birthDate)
      };

      const response = await fetch(`${backendUrl}/automation/debt_certificate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Ошибка генерации справки');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Справка_об_отсутствии_долгов.docx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Справка успешно сгенерирована!');
      handleClose();
    } catch (error) {
      console.error(error);
      toast.error('Произошла ошибка при генерации справки');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={style}>
        <Typography variant="h6" component="h2" mb={2}>
          Справка об отсутствии долгов
        </Typography>
        <Box display="flex" flexDirection="column" gap={2}>
          <FormControlLabel
            control={<Checkbox checked={includeFio} onChange={(e) => setIncludeFio(e.target.checked)} />}
            label="С ФИО"
          />
          <FormControlLabel
            control={<Checkbox checked={includeStamp} onChange={(e) => setIncludeStamp(e.target.checked)} />}
            label="С печатью"
          />
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleGenerate} 
            disabled={isLoading}
            fullWidth
          >
            {isLoading ? <CircularProgress size={24} /> : 'Сгенерировать'}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default DebtCertificateModal;
