import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, CardHeader, Input, Label } from '@/components/ui';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { post } from '@/lib/apiClient';
import type { StudentSignupData, StudentSignupResponse } from '@/services/classroomService';

export default function StudentSignupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<StudentSignupData>({
    resolver: yupResolver(
      yup.object().shape({
        name: yup.string().required(t('required')).min(2, t('min_length')).max(100, t('max_length')),
        email: yup.string().required(t('required')).email(t('invalid_email')).max(255, t('max_length')),
        password: yup.string().required(t('required')).min(8, t('min_password')).max(100, t('max_length')),
        student_id: yup.string().required(t('required')).min(4, t('min_length')).max(20, t('max_length')),
      })
    ),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      student_id: '',
    },
  });

  const onSubmit = async (values: StudentSignupData) => {
    setIsSubmitting(true);
    try {
      await post<StudentSignupResponse>('/classroom/auth/signup.php', values);
      navigate('/student/pending');
    } catch (error) {
      form.setError('root', {
        message: error instanceof Error ? error.message : t('signup_failed'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-md w-full">
      <CardHeader>
        <h2 className="text-xl font-bold">{t('student_signup')}</h2>
      </CardHeader>
      <CardContent>
        {form.formState.errors.root && (
          <p role="alert" className="text-sm text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="space-y-4">
            <Label htmlFor="name">{t('name')}</Label>
            <Input
              id="name"
              {...form.register('name')}
              placeholder={t('name_placeholder')}
              className="h-10"
              required
            />

            <Label htmlFor="email">{t('email')}</Label>
            <Input
              id="email"
              {...form.register('email')}
              type="email"
              placeholder={t('email_placeholder')}
              className="h-10"
              required
            />

            <Label htmlFor="password">{t('password')}</Label>
            <Input
              id="password"
              {...form.register('password')}
              type="password"
              placeholder={t('password_placeholder')}
              className="h-10"
              required
            />

            <Label htmlFor="student_id">{t('student_id')}</Label>
            <Input
              id="student_id"
              {...form.register('student_id')}
              placeholder={t('student_id_placeholder')}
              className="h-10"
              required
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('creating_account') : t('create_account')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}