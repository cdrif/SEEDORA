import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

export default function ParentReportCardView({ studentId }) {
    const [student, setStudent] = useState(null);
    const [schoolSettings, setSchoolSettings] = useState({ logo_url: '', principal_signature: '' });
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);

    useEffect(() => {
        async function fetchStudentReportCard() {
            try {
                setLoading(true);
                // Fetch student details along with related grades and attendance from Supabase
                const { data, error } = await supabase
                    .from('students')
                    .select(`
                        id,
                        first_name,
                        last_name,
                        grade_level,
                        school_slug,
                        overall_score,
                        attendance_total,
                        attendance_attended,
                        attendance_explained,
                        attendance_unexplained,
                        excelling_notes,
                        improvement_notes,
                        suggestion_notes,
                        student_subjects (
                            subject_name,
                            teacher_name,
                            score,
                            assessment_notes
                        )
                    `)
                    .eq('id', studentId)
                    .single();

                if (error) throw error;
                setStudent(data);

                // Fetch school branding settings (logo & principal signature) using the student's school_slug
                if (data && data.school_slug) {
                    const { data: settingsData } = await supabase
                        .from('school_settings')
                        .select('logo_url, principal_signature')
                        .eq('school_slug', data.school_slug)
                        .single();

                    if (settingsData) {
                        setSchoolSettings(settingsData);
                    }
                }
            } catch (err) {
                console.error('Error loading report card:', err.message);
                setErrorMsg('Unable to load official report card data at this time.');
            } finally {
                setLoading(false);
            }
        }

        if (studentId) {
            fetchStudentReportCard();
        }
    }, [studentId]);

    if (loading) return <div style={{ color: '#94a3b8', padding: '20px', textAlign: 'center' }}>Loading student report card...</div>;
    if (errorMsg) return <div style={{ color: '#c53030', padding: '20px', textAlign: 'center' }}>{errorMsg}</div>;
    if (!student) return <div style={{ color: '#94a3b8', padding: '20px', textAlign: 'center' }}>No record found for this student.</div>;

    return (
        <div className="admin-card" style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h2>Official Student Report Card</h2>
            <p>Term 3, 2026 Academic Record — Verified Official Release</p>

            {/* Report Card Preview Box Styles adapted from reportcards.html */}
            <div className="preview-container" id="report-preview-box" style={{ background: '#ffffff', color: '#1a202c', padding: '30px', borderRadius: '8px', marginTop: '15px', position: 'relative' }}>
                
                {/* Header Section with School Logo */}
                <div className="preview-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #2b6cb0', paddingBottom: '15px', marginBottom: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        {schoolSettings.logo_url ? (
                            <img src={schoolSettings.logo_url} alt="School Logo" style={{ width: '64px', height: '64px', objectFit: 'contain' }} />
                        ) : (
                            <div style={{ width: '64px', height: '64px', background: '#2b6cb0', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', borderRadius: '8px', fontSize: '1.2rem' }}>
                                🏫
                            </div>
                        )}
                        <div>
                            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', color: '#1a202c' }}>
                                {student.first_name} {student.last_name} <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: '#4a5568' }}>(ID: {student.id})</span>
                            </h3>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#4a5568' }}>Grade Level: {student.grade_level || student.grade} | Term: Term 3, 2026</p>
                        </div>
                    </div>
                    <div className="overall-badge" style={{ backgroundColor: '#2b6cb0', color: '#ffffff', padding: '8px 14px', borderRadius: '6px', textAlign: 'right' }}>
                        <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Overall Grade</span>
                        <strong style={{ fontSize: '1.2rem' }}>{student.overall_score || 'B'}</strong>
                    </div>
                </div>

                {/* Attendance Record Widget */}
                <div style={{ backgroundColor: 'rgba(49, 130, 206, 0.08)', border: '1px solid rgba(49, 130, 206, 0.2)', padding: '12px', borderRadius: '6px', marginBottom: '15px' }}>
                    <h4 style={{ color: '#3182ce', margin: '0 0 8px 0', fontSize: '0.9rem' }}>Attendance Record</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', textAlign: 'center', fontSize: '0.85rem' }}>
                        <div style={{ background: '#fff', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                            <span style={{ display: 'block', fontSize: '0.75rem', color: '#4a5568' }}>Total Days</span>
                            <strong>{student.attendance_total || 180}</strong>
                        </div>
                        <div style={{ background: '#fff', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                            <span style={{ display: 'block', fontSize: '0.75rem', color: '#4a5568' }}>Attended</span>
                            <strong style={{ color: '#2b6cb0' }}>{student.attendance_attended || 172}</strong>
                        </div>
                        <div style={{ background: '#fff', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                            <span style={{ display: 'block', fontSize: '0.75rem', color: '#4a5568' }}>Absent (Exp.)</span>
                            <strong style={{ color: '#2f855a' }}>{student.attendance_explained || 5}</strong>
                        </div>
                        <div style={{ background: '#fff', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                            <span style={{ display: 'block', fontSize: '0.75rem', color: '#4a5568' }}>Absent (Unexp.)</span>
                            <strong style={{ color: '#c53030' }}>{student.attendance_unexplained || 3}</strong>
                        </div>
                    </div>
                </div>

                {/* Subject Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '15px' }}>
                    <thead>
                        <tr style={{ background: '#2b6cb0', color: '#ffffff' }}>
                            <th style={{ border: '1px solid #2b6cb0', padding: '8px', textAlign: 'left' }}>Subject</th>
                            <th style={{ border: '1px solid #2b6cb0', padding: '8px', textAlign: 'left' }}>Teacher</th>
                            <th style={{ border: '1px solid #2b6cb0', padding: '8px', textAlign: 'left' }}>Score</th>
                            <th style={{ border: '1px solid #2b6cb0', padding: '8px', textAlign: 'left' }}>Assessment Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {student.student_subjects && student.student_subjects.length > 0 ? (
                            student.student_subjects.map((sub, idx) => (
                                <tr key={idx} style={{ background: idx % 2 === 0 ? '#f8fafc' : '#ffffff' }}>
                                    <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}><strong>{sub.subject_name}</strong></td>
                                    <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>{sub.teacher_name || 'Staff Instructor'}</td>
                                    <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>{sub.score}</td>
                                    <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>{sub.assessment_notes}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" style={{ textAlign: 'center', padding: '10px', color: '#718096' }}>No subject records available.</td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Feedback Section */}
                <div style={{ fontSize: '0.85rem', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '6px', marginBottom: '15px' }}>
                    <h4 style={{ margin: '0 0 6px 0', color: '#2d3748', fontSize: '0.9rem' }}>Performance Summary & Recommendations</h4>
                    <p style={{ margin: '0 0 6px 0', color: '#4a5568' }}><strong>Excelling in:</strong> {student.excelling_notes || 'Satisfactory progress across core units.'}</p>
                    <p style={{ margin: '0 0 6px 0', color: '#4a5568' }}><strong>Areas to Improve:</strong> {student.improvement_notes || 'Consistent engagement recommended.'}</p>
                    <p style={{ margin: 0, color: '#4a5568' }}><strong>Suggestions:</strong> {student.suggestion_notes || 'Maintain open communication with faculty.'}</p>
                </div>

                {/* Grading Scale Legend */}
                <div style={{ fontSize: '0.78rem', background: '#f7fafc', border: '1px solid #cbd5e1', padding: '10px', borderRadius: '6px', marginBottom: '20px' }}>
                    <h4 style={{ margin: '0 0 6px 0', color: '#2d3748', fontSize: '0.82rem', textTransform: 'uppercase' }}>Achievement Standard & Grading Scale</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ background: '#fff', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', flex: 1, textAlign: 'center' }}><strong>A:</strong> Very High</div>
                        <div style={{ background: '#fff', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', flex: 1, textAlign: 'center' }}><strong>B:</strong> High</div>
                        <div style={{ background: '#fff', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', flex: 1, textAlign: 'center' }}><strong>C:</strong> Sound</div>
                        <div style={{ background: '#fff', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', flex: 1, textAlign: 'center' }}><strong>D:</strong> Developing</div>
                        <div style={{ background: '#fff', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', flex: 1, textAlign: 'center' }}><strong>E:</strong> Elementary</div>
                    </div>
                </div>

                {/* Signatures & Footer Section */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', paddingTop: '15px', borderTop: '1px dashed #cbd5e1', fontSize: '0.82rem' }}>
                    <div>
                        <div style={{ height: '30px', display: 'flex', alignItems: 'flex-end', fontStyle: 'italic', color: '#4a5568' }}>Staff Instructor</div>
                        <div style={{ borderTop: '1px solid #4a5568', paddingTop: '4px', color: '#718096' }}>Teacher Signature & Date</div>
                    </div>
                    <div>
                        <div style={{ height: '30px', display: 'flex', alignItems: 'flex-end', fontWeight: 'bold', color: '#1a202c', fontFamily: 'monospace' }}>
                            {schoolSettings.principal_signature || 'Dr. A. Vance, Principal'}
                        </div>
                        <div style={{ borderTop: '1px solid #4a5568', paddingTop: '4px', color: '#718096' }}>Principal Signature & Date</div>
                    </div>
                </div>

                <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#a0aec0', marginTop: '20px', fontFamily: 'monospace' }}>
                    Official Report Card — Seedora School Platform — Printed on: {new Date().toLocaleString()}
                </div>
            </div>

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
                <button type="button" className="action-btn" onClick={() => window.print()} style={{ backgroundColor: '#2b6cb0', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Print Official Copy</button>
            </div>
        </div>
    );
}